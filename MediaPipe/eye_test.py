import cv2
import mediapipe as mp
from jerk import EyeTracker

face_mesh = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True)
tracker = EyeTracker(test_duration=15)

last_left_iris = None
last_right_iris = None


def process_frame(frame):
    global last_left_iris, last_right_iris

    frame = cv2.flip(frame, 1)
    h, w, _ = frame.shape
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if results.multi_face_landmarks:
        lm = results.multi_face_landmarks[0].landmark
        iris_x = int(lm[468].x * w)
        nose_x = int(lm[1].x * w)
        res = tracker.update(iris_x, nose_x, frame_width=w)

        left_iris_points = [(lm[468].x, lm[468].y)]
        right_iris_points = [(lm[473].x, lm[473].y)]

        # remember last good values
        last_left_iris = left_iris_points
        last_right_iris = right_iris_points

        return {
            "leftIris": left_iris_points,
            "rightIris": right_iris_points,
            "jerkiness": res["score"],
            "status": res["status"],
            "isFailing": res["status"].startswith("❌"),
            "finished": res["finished"],
        }

    # fallback → reuse last known iris if detection fails
    return {
        "leftIris": last_left_iris if last_left_iris else [],
        "rightIris": last_right_iris if last_right_iris else [],
        "jerkiness": 0,
        "status": "Analyzing...",
        "isFailing": False,
        "finished": False,
    }
