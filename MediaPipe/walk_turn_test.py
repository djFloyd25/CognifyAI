import cv2
import mediapipe as mp

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose()
mp_drawing = mp.solutions.drawing_utils


def main():
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            print("❌ Failed to capture frame")
            break

        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        status = "Analyzing..."
        alignment, stability = None, None
        fail_counter = 0

        if results.pose_landmarks:
            lm = results.pose_landmarks.landmark

            # Ankles
            left_ankle = (
                lm[mp_pose.PoseLandmark.LEFT_ANKLE].x,
                lm[mp_pose.PoseLandmark.LEFT_ANKLE].y,
            )
            right_ankle = (
                lm[mp_pose.PoseLandmark.RIGHT_ANKLE].x,
                lm[mp_pose.PoseLandmark.RIGHT_ANKLE].y,
            )

            # Wrists + Hips
            left_wrist = lm[mp_pose.PoseLandmark.LEFT_WRIST]
            right_wrist = lm[mp_pose.PoseLandmark.RIGHT_WRIST]
            left_hip = lm[mp_pose.PoseLandmark.LEFT_HIP]
            right_hip = lm[mp_pose.PoseLandmark.RIGHT_HIP]

            # Shoulders
            left_shoulder = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
            right_shoulder = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]

            # Draw ankle landmarks
            cv2.circle(
                frame,
                (int(left_ankle[0] * w), int(left_ankle[1] * h)),
                8,
                (0, 0, 255),
                -1,
            )
            cv2.circle(
                frame,
                (int(right_ankle[0] * w), int(right_ankle[1] * h)),
                8,
                (0, 255, 0),
                -1,
            )

            # Heel-to-toe alignment (small horizontal gap is good)
            alignment = abs(left_ankle[0] - right_ankle[0])

            # Step stability (should stay roughly level vertically)
            stability = abs(left_ankle[1] - right_ankle[1])

            # Arm distance from hips
            left_arm_dist = abs(left_wrist.x - left_hip.x)
            right_arm_dist = abs(right_wrist.x - right_hip.x)

            # Shoulder tilt (how uneven shoulders are)
            shoulder_angle = abs(left_shoulder.y - right_shoulder.y)

            # Simple scoring logic
            if alignment > 0.1:
                status = "FAIL (not heel-to-toe)"
                fail_counter += 1
            elif stability > 0.1:
                status = "FAIL (unstable gait)"
                fail_counter += 1
            elif left_arm_dist > 0.15 or right_arm_dist > 0.15:
                status = "FAIL (arms used for balance)"
                fail_counter += 1
            elif abs(left_ankle[0] - right_ankle[0]) > 0.25 or shoulder_angle > 0.15:
                status = "FAIL (lost balance while turning)"
                fail_counter += 1
            else:
                status = "PASS"

            hip_center_y = (left_hip.y + right_hip.y) / 2
            shoulder_center_y = (left_shoulder.y + right_shoulder.y) / 2
            hip_tilt = abs(left_hip.y - right_hip.y)

            if hip_center_y > 0.9 or shoulder_center_y > 0.9:
                status = "FAIL (possible fall detected)"
                fail_counter += 1

            elif hip_tilt > 0.2 or shoulder_angle > 0.25:
                status = "FAIL (stumbled / heavy lean)"
                fail_counter += 1

        # Draw pose skeleton
        mp_drawing.draw_landmarks(
            frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS
        )

        # Show metrics
        cv2.putText(
            frame,
            f"Status: {status}",
            (30, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0) if "PASS" in status else (0, 0, 255),
            2,
        )
        if alignment is not None and stability is not None:
            cv2.putText(
                frame,
                f"Align: {alignment:.3f} | Stability: {stability:.3f}",
                (30, 80),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 255),
                2,
            )

        cv2.imshow("Walk-and-Turn Test", frame)

        if cv2.waitKey(5) & 0xFF == 27:  # ESC to quit
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
