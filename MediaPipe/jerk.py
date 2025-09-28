import time

import numpy as np


class EyeTracker:
    def __init__(
        self,
        window_size=150,
        jerkiness_factor=2.0,
        displacement_ratio=0.25,  # allow 25% of frame width movement
        test_duration=15,
    ):
        self.window_size = window_size
        self.jerkiness_factor = jerkiness_factor
        self.displacement_ratio = displacement_ratio
        self.test_duration = test_duration

        self.iris_positions = []
        self.timestamps = []
        self.nose_baseline = None
        self.start_time = None
        self.score = 100
        self.status = "Starting..."
        self.color = (255, 255, 255)
        self.finished = False
        self.frame_width = None  # store frame width to scale head movement

    def start(self):
        """Begin a new test"""
        self.start_time = time.time()
        self.iris_positions.clear()
        self.timestamps.clear()
        self.nose_baseline = None
        self.score = 100
        self.status = "Analyzing..."
        self.finished = False

    def update(self, iris_x, nose_x, frame_width=None):
        """Update tracker with new iris/nose position per frame"""
        if self.start_time is None:
            self.start()

        if frame_width:
            self.frame_width = frame_width

        current_time = time.time()
        elapsed = current_time - self.start_time

        # Save iris position
        self.iris_positions.append(iris_x)
        self.timestamps.append(current_time)

        # Keep baseline nose position
        if self.nose_baseline is None:
            self.nose_baseline = nose_x

        # Trim buffer
        if len(self.iris_positions) > self.window_size:
            self.iris_positions.pop(0)
            self.timestamps.pop(0)

        # Calculate jerkiness + jerks
        if len(self.iris_positions) > 5:
            velocities = np.diff(self.iris_positions) / np.diff(self.timestamps)
            jerkiness = np.std(velocities)
            jerks = np.sum(np.abs(np.diff(velocities)) > 20)

            self.score = max(0, 100 - jerkiness * self.jerkiness_factor - jerks * 5)

            # Head movement check (relative to frame width if known)
            if self.frame_width:
                allowed_shift = self.frame_width * self.displacement_ratio
            else:
                allowed_shift = 120  # fallback default

            if abs(nose_x - self.nose_baseline) > allowed_shift:
                self.status = "❌ INVALID TEST (Move eyes only)"
                self.color = (0, 0, 255)
                self.score = 0
                self.finished = True
            elif self.score >= 70:
                self.status = f"Live Score: {int(self.score)} ✅"
                self.color = (0, 255, 0)
            else:
                self.status = f"Live Score: {int(self.score)} ❌"
                self.color = (0, 0, 255)

        # End test after duration
        if elapsed >= self.test_duration and not self.finished:
            self.finished = True
            if self.score == 0 and "INVALID" in self.status:
                self.status = "❌ INVALID TEST (Redo required)"
                self.color = (0, 0, 255)
            elif self.score >= 70:
                self.status = f"✅ FINAL SCORE: {int(self.score)} (PASS)"
                self.color = (0, 255, 0)
            else:
                self.status = f"❌ FINAL SCORE: {int(self.score)} (FAIL)"
                self.color = (0, 0, 255)

        return {
            "score": int(self.score),
            "status": self.status,
            "finished": self.finished,
        }
