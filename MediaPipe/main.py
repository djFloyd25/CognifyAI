import cv2
import mediapipe as mp
import json
import base64
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
import asyncio

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
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

def process_frame(frame):
    # Convert the frame to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process the frame with MediaPipe
    results = face_mesh.process(rgb_frame)
    
    if results.multi_face_landmarks:
        landmarks = results.multi_face_landmarks[0].landmark
        
        # Get iris landmarks
        left_iris = [(lm.x, lm.y) for lm in landmarks[468:473]]
        right_iris = [(lm.x, lm.y) for lm in landmarks[473:478]]
        
        return {
            "leftIris": left_iris,
            "rightIris": right_iris,
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
