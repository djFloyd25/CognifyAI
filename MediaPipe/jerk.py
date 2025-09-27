import time

import cv2
import mediapipe as mp
import numpy as np

# --- Setup camera and FaceMesh ---
cam = cv2.VideoCapture(0)
face_mesh = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True)

eye_positions = []
timestamps = []

# --- Parameters ---
WINDOW_SIZE = 100  # number of frames to keep in history
JERKINESS_THRESHOLD = 20  # tweak experimentally
FAIL_FRAMES_REQUIRED = 15  # how many frames above threshold before "FAIL"

# --- Safe defaults (avoid crash before values exist) ---
status_text = "Analyzing..."
color = (255, 255, 255)  # white
fail_counter = 0

while True:
    ret, frame = cam.read()
    if not ret:
        break

    # Flip horizontally for mirror effect
    frame = cv2.flip(frame, 1)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb_frame)
    frame_h, frame_w, _ = frame.shape

    # --- Moving dot target (red) ---
    t = time.time()
    dot_x = int((np.sin(t) * 0.4 + 0.5) * frame_w)  # sinusoidal motion
    dot_y = frame_h // 2
    cv2.circle(frame, (dot_x, dot_y), 10, (0, 0, 255), -1)

    # --- Iris tracking ---
    if results.multi_face_landmarks:
        landmarks = results.multi_face_landmarks[0].landmark
        left_iris = landmarks[468]  # left iris center
        x = int(left_iris.x * frame_w)
        y = int(left_iris.y * frame_h)
        cv2.circle(frame, (x, y), 3, (0, 255, 0), -1)

        # Store tracking data
        eye_positions.append(x)
        timestamps.append(t)

        if len(eye_positions) > WINDOW_SIZE:
            eye_positions.pop(0)
            timestamps.pop(0)

        # --- Compute jerkiness metric ---
        if len(eye_positions) > 5:
            velocities = np.diff(eye_positions) / np.diff(timestamps)
            jerkiness = np.std(velocities)

            # Debugging display
            cv2.putText(
                frame,
                f"Jerkiness: {jerkiness:.2f}",
                (30, 80),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 255),
                2,
            )

            # Update fail counter
            if jerkiness > JERKINESS_THRESHOLD:
                fail_counter += 1
            else:
                fail_counter = max(0, fail_counter - 1)

            # Decide pass/fail
            if fail_counter > FAIL_FRAMES_REQUIRED:
                status_text = "❌ FAIL"
                color = (0, 0, 255)  # red
            else:
                status_text = "✅ PASS"
                color = (0, 255, 0)  # green

    # --- Overlay Pass/Fail in top-left ---
    cv2.putText(frame, status_text, (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3)

    # Show feed
    cv2.imshow("HGN Sobriety Test", frame)
    if cv2.waitKey(1) & 0xFF == 27:  # ESC to quit
        break

cam.release()
cv2.destroyAllWindows()