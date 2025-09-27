import time

import cv2
import mediapipe as mp
import numpy as np

cam = cv2.VideoCapture(0)
face_mesh = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True)

timestamps, eye_positions = [], []
cue = "left"
last_switch = time.time()
interval = 2.0  # seconds between cues

while True:
    ret, frame = cam.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)
    h, w, _ = frame.shape

    # Target positions: close to screen edges
    left_pos = (int(w * 0.1), h // 2)
    right_pos = (int(w * 0.9), h // 2)

    # Alternate cues
    if time.time() - last_switch > interval:
        cue = "right" if cue == "left" else "left"
        last_switch = time.time()

    # Draw targets
    if cue == "left":
        cv2.circle(frame, left_pos, 20, (0, 0, 255), -1)
        cv2.circle(frame, right_pos, 20, (50, 50, 50), -1)
    else:
        cv2.circle(frame, left_pos, 20, (50, 50, 50), -1)
        cv2.circle(frame, right_pos, 20, (0, 0, 255), -1)

    # Iris tracking
    if results.multi_face_landmarks:
        lm = results.multi_face_landmarks[0].landmark
        iris = lm[468]  # left iris center
        iris_x = int(iris.x * w)
        iris_y = int(iris.y * h)
        cv2.circle(frame, (iris_x, iris_y), 4, (0, 255, 0), -1)

        # Check if subject followed cue far enough
        if cue == "left":
            following = iris_x < w * 0.35
        else:
            following = iris_x > w * 0.65

        status_text = "Following" if following else "Not Following"
        color = (0, 255, 0) if following else (0, 0, 255)

        cv2.putText(frame, status_text, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

    cv2.imshow("Edge Gaze HGN Test", frame)
    if cv2.waitKey(1) & 0xFF == 27:  # ESC to quit
        break

cam.release()
cv2.destroyAllWindows()
