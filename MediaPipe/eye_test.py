import time

import cv2
import mediapipe as mp
from jerk import EyeTracker

# Init Mediapipe + EyeTracker
face_mesh = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True)
tracker = EyeTracker(test_duration=15)


def init_camera():
    return cv2.VideoCapture(0)


def process_frame(frame):
    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if results.multi_face_landmarks:
        lm = results.multi_face_landmarks[0].landmark
        iris_x = int(lm[468].x * w)  # left iris
        nose_x = int(lm[1].x * w)  # nose tip
        res = tracker.update(iris_x, nose_x)

        # Build JSON with all fields React expects
        left_iris_points = [(lm[468].x, lm[468].y)]
        right_iris_points = [(lm[473].x, lm[473].y)]

        return {
            "leftIris": left_iris_points,
            "rightIris": right_iris_points,
            "targetDot": {"x": 0.5, "y": 0.5},  # dummy target
            "jerkiness": res["score"],  # reuse score as jerkiness bar
            "status": res["status"],
            "isFailing": res["status"].startswith("❌"),
            "finished": res["finished"],
        }

    return None
