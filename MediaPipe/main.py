import asyncio

import cv2
import uvicorn
from eye_test import process_frame  # make sure eye_test.py is in the same folder
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow everything for dev (lock down in prod!)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/eye")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint that streams iris tracking data
    with smoothness + jerkiness metrics to the frontend.
    """
    await websocket.accept()
    cap = cv2.VideoCapture(0)  # capture webcam

    try:
        while True:
            success, frame = cap.read()
            if not success:
                break

            result = process_frame(frame)  # call into eye_test.py

            # Send JSON result to frontend
            await websocket.send_json(result)

            await asyncio.sleep(0.033)  # ~30 FPS

    except Exception as e:
        print(f"❌ Error in WebSocket: {e}")

    finally:
        cap.release()
        await websocket.close()


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
