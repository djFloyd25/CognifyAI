import cv2
import mediapipe as mp

cam = cv2.VideoCapture(0)
face_mesh = mp.solutions.face_mesh.FaceMesh(refine_landmarks=True)

while True:
    ret, frame = cam.read()
    if not ret:
        break

    # Flip horizontally for a mirror effect (comment this out if you want raw view)
    frame = cv2.flip(frame, 1)

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    output = face_mesh.process(rgb_frame)
    landmark_points = output.multi_face_landmarks
    frame_h, frame_w, _ = frame.shape

    if landmark_points:
        landmarks = landmark_points[0].landmark

        # Iris landmarks (474–477)
        for id, landmark in enumerate(landmarks[474:478]):
            x = int(landmark.x * frame_w)
            y = int(landmark.y * frame_h)
            cv2.circle(frame, (x, y), 3, (0, 255, 0), -1)

        # Upper/lower eyelid landmarks (145, 159) for left eye
        left = [landmarks[145], landmarks[159]]
        for landmark in left:
            x = int(landmark.x * frame_w)
            y = int(landmark.y * frame_h)
            cv2.circle(frame, (x, y), 3, (0, 255, 255), -1)

        # Simple blink detection
        if (left[0].y - left[1].y) < 0.004:
            cv2.putText(
                frame,
                "Blink detected",
                (30, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                2,
            )

    cv2.imshow("Eye Tracking (Mirror View)", frame)
    if cv2.waitKey(1) & 0xFF == 27:  # ESC to quit
        break

cam.release()
cv2.destroyAllWindows()
