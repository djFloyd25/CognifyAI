import cv2
import mediapipe as mp
import json
import base64
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
import asyncio
from collections import deque
import time
import math

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe Face Mesh
face_mesh = mp.solutions.face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Parameters from jerk.py
WINDOW_SIZE = 100  # number of frames to keep in history
JERKINESS_THRESHOLD = 20  # threshold for failing
FAIL_FRAMES_REQUIRED = 15  # how many frames above threshold before "FAIL"

# Store tracking data
class EyeTracker:
    def __init__(self):
        self.eye_positions = []
        self.timestamps = []
        self.fail_counter = 0
        self.status = "Analyzing..."
        self.last_jerkiness = 0
        self.start_time = time.time()
    
    def calculate_dot_position(self, frame_w, frame_h):
        t = time.time() - self.start_time
        dot_x = int((np.sin(t) * 0.4 + 0.5) * frame_w)
        dot_y = frame_h // 2
        return dot_x, dot_y
    
    def update(self, x, timestamp):
        self.eye_positions.append(x)
        self.timestamps.append(timestamp)
        
        if len(self.eye_positions) > WINDOW_SIZE:
            self.eye_positions.pop(0)
            self.timestamps.pop(0)
        
        if len(self.eye_positions) > 5:
            velocities = np.diff(self.eye_positions) / np.diff(self.timestamps)
            jerkiness = np.std(velocities)
            self.last_jerkiness = jerkiness
            
            if jerkiness > JERKINESS_THRESHOLD:
                self.fail_counter += 1
            else:
                self.fail_counter = max(0, self.fail_counter - 1)
            
            if self.fail_counter > FAIL_FRAMES_REQUIRED:
                self.status = "FAIL"
            else:
                self.status = "PASS"
        
        return self.last_jerkiness, self.status

# Create global tracker instance
tracker = EyeTracker()

def process_frame(frame):
    # Mirror the frame horizontally
    frame = cv2.flip(frame, 1)
    frame_h, frame_w, _ = frame.shape
    
    # Get target dot position
    dot_x, dot_y = tracker.calculate_dot_position(frame_w, frame_h)
    
    # Convert the frame to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process the frame with MediaPipe
    results = face_mesh.process(rgb_frame)
    
    if results.multi_face_landmarks:
        landmarks = results.multi_face_landmarks[0].landmark
        
        # Get iris center (using landmark 468 - left iris center)
        left_iris = landmarks[468]
        iris_x = int(left_iris.x * frame_w)
        iris_y = int(left_iris.y * frame_h)
        
        # Update tracker with new position
        current_time = time.time()
        jerkiness, status = tracker.update(iris_x, current_time)
        
        # Get all iris landmarks for visualization
        left_iris_points = [(lm.x, lm.y) for lm in landmarks[468:473]]
        right_iris_points = [(lm.x, lm.y) for lm in landmarks[473:478]]
        
        return {
            "leftIris": left_iris_points,
            "rightIris": right_iris_points,
            "targetDot": {
                "x": dot_x / frame_w,  # Normalize to 0-1 range
                "y": dot_y / frame_h
            },
            "jerkiness": jerkiness,
            "status": status,
            "isFailing": status == "FAIL"
        }
    
    return None

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Initialize camera
    cap = cv2.VideoCapture(0)
    
    try:
        while True:
            success, frame = cap.read()
            if not success:
                break
                
            # Process the frame
            results = process_frame(frame)
            
            if results:
                # Send the results to the frontend
                await websocket.send_json(results)
            
            # Small delay to control frame rate
            await asyncio.sleep(0.033)  # ~30 FPS
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cap.release()

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
