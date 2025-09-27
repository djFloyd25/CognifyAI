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
from typing import Deque, List, Tuple
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

# Store previous positions for jerkiness calculation
left_iris_history: Deque[List[Tuple[float, float]]] = deque(maxlen=10)  # Store last 10 frames
right_iris_history: Deque[List[Tuple[float, float]]] = deque(maxlen=10)

def calculate_jerkiness(history: Deque[List[Tuple[float, float]]]) -> float:
    if len(history) < 3:
        return 0.0
        
    # Calculate the average movement speed between consecutive frames
    speeds = []
    for i in range(len(history) - 1):
        current_center = np.mean(history[i], axis=0)
        next_center = np.mean(history[i + 1], axis=0)
        
        # Calculate Euclidean distance
        speed = math.sqrt((next_center[0] - current_center[0])**2 + 
                         (next_center[1] - current_center[1])**2)
        speeds.append(speed)
    
    # Calculate the change in speed (acceleration)
    accelerations = []
    for i in range(len(speeds) - 1):
        acceleration = abs(speeds[i + 1] - speeds[i])
        accelerations.append(acceleration)
    
    # High acceleration indicates jerky movement
    # Return average acceleration normalized to a 0-1 scale
    # Values above 0.5 indicate significant jerkiness
    jerkiness = np.mean(accelerations) * 100 if accelerations else 0
    return min(1.0, jerkiness)

def process_frame(frame):
    # Mirror the frame horizontally
    frame = cv2.flip(frame, 1)
    
    # Convert the frame to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process the frame with MediaPipe
    results = face_mesh.process(rgb_frame)
    
    if results.multi_face_landmarks:
        landmarks = results.multi_face_landmarks[0].landmark
        
        # Get iris landmarks
        left_iris = [(lm.x, lm.y) for lm in landmarks[468:473]]
        right_iris = [(lm.x, lm.y) for lm in landmarks[473:478]]
        
        # Update history
        left_iris_history.append(left_iris)
        right_iris_history.append(right_iris)
        
        # Calculate jerkiness scores
        left_jerkiness = calculate_jerkiness(left_iris_history)
        right_jerkiness = calculate_jerkiness(right_iris_history)
        
        # Calculate average jerkiness
        avg_jerkiness = (left_jerkiness + right_jerkiness) / 2
        
        # Define jerkiness threshold for impairment warning
        jerkiness_threshold = 0.5
        
        return {
            "leftIris": left_iris,
            "rightIris": right_iris,
            "leftJerkiness": left_jerkiness,
            "rightJerkiness": right_jerkiness,
            "averageJerkiness": avg_jerkiness,
            "impairmentWarning": avg_jerkiness > jerkiness_threshold
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
