import cv2
import mediapipe as mp
import json
import asyncio
from fastapi import FastAPI, WebSocket
import uvicorn

app = FastAPI()

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()

@app.websocket("/ws/walk")
async def walk_and_turn(websocket: WebSocket):
    await websocket.accept()
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        status = "Analyzing..."
        data = {}

        if results.pose_landmarks:
            lm = results.pose_landmarks.landmark

            left_ankle = (lm[mp_pose.PoseLandmark.LEFT_ANKLE].x,
                          lm[mp_pose.PoseLandmark.LEFT_ANKLE].y)
            right_ankle = (lm[mp_pose.PoseLandmark.RIGHT_ANKLE].x,
                           lm[mp_pose.PoseLandmark.RIGHT_ANKLE].y)

            # Heel-to-toe alignment check
            alignment = abs(left_ankle[0] - right_ankle[0])
            if alignment > 0.1:
                status = "FAIL (not heel-to-toe)"
            else:
                status = "PASS"

            data = {
                "status": status,
                "leftAnkle": left_ankle,
                "rightAnkle": right_ankle,
            }

        # Send JSON data to frontend
        await websocket.send_text(json.dumps(data))

        # Small pause to avoid flooding
        await asyncio.sleep(0.05)

    cap.release()

if __name__ == "__main__":
    uvicorn.run("walk_server:app", host="0.0.0.0", port=8000)
