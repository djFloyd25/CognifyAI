import cv2
from GazeTracking.gaze_tracking import GazeTracking  # adjust import if needed

gaze = GazeTracking()
webcam = cv2.VideoCapture(0)

frame_id = 0

while True:
    ret, frame = webcam.read()
    if not ret:
        break

    frame_id += 1

    # Only analyze every 2nd frame, but always show video
    if frame_id % 1 == 0:
        gaze.refresh(frame)
        frame = gaze.annotated_frame()

        if gaze.is_blinking():
            text = "Blinking"
        elif gaze.is_right():
            text = "Looking right"
        elif gaze.is_left():
            text = "Looking left"
        elif gaze.is_center():
            text = "Looking center"
        else:
            text = "Calibrating..."

        cv2.putText(
            frame, text, (90, 60), cv2.FONT_HERSHEY_DUPLEX, 1.6, (147, 58, 31), 2
        )

    cv2.imshow("Eye Tracking", frame)
    if cv2.waitKey(1) == 27:
        break

webcam.release()
cv2.destroyAllWindows()
