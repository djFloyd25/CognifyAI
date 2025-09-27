import base64
import json

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your Next.js app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe
face_mesh = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # Initialize webcam
    cam = cv2.VideoCapture(0)

    try:
        while True:
            _, frame = cam.read()
            if frame is None:
                continue

            frame = cv2.flip(frame, 1)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            output = face_mesh.process(rgb_frame)
            landmark_points = output.multi_face_landmarks
            frame_h, frame_w, _ = frame.shape

            if landmark_points:
                landmarks = landmark_points[0].landmark
                eye_data = {"leftEye": [], "rightEye": [], "eyeState": "open"}

                # Get left eye landmarks
                left = [landmarks[145], landmarks[159]]
                eye_data["leftEye"] = [
                    {"x": left[0].x, "y": left[0].y},
                    {"x": left[1].x, "y": left[1].y},
                ]

                # Check if eyes are closed
                if (left[0].y - left[1].y) < 0.004:
                    eye_data["eyeState"] = "closed"

                # Encode frame to base64 for sending to frontend
                _, buffer = cv2.imencode(".jpg", frame)
                img_str = base64.b64encode(buffer).decode()

                # Send data to frontend
                await websocket.send_json({"eye_data": eye_data, "image": img_str})

    except Exception as e:
        print(f"Error: {e}")
    finally:
        cam.release()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
