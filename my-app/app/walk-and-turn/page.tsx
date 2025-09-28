"use client";

import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HeelToeTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [landmarker, setLandmarker] = useState<PoseLandmarker | null>(null);
  const router = useRouter();

  const [leftHeelRightToeGap, setLeftHeelRightToeGap] = useState<number | null>(
    null
  );
  const [rightHeelLeftToeGap, setRightHeelLeftToeGap] = useState<number | null>(
    null
  );
  const [unstable, setUnstable] = useState<boolean>(false);
  const [usingArms, setUsingArms] = useState<boolean>(false);

  const [testStarted, setTestStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  // error tracking refs
  const heelErrorActive = useRef(false);
  const balanceErrorActive = useRef(false);
  const armsErrorActive = useRef(false);

  useEffect(() => {
    console.log("Error count updated:", errorCount);
  }, [errorCount]);

  useEffect(() => {
    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );

      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      setLandmarker(poseLandmarker);

      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const render = () => {
          if (
            videoRef.current &&
            canvasRef.current &&
            videoRef.current.readyState === 4
          ) {
            const ctx = canvasRef.current.getContext("2d")!;
            ctx.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );

            // Always draw the live camera feed
            ctx.drawImage(
              videoRef.current,
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );

            // Only track stats if countdown finished and test not finished
            if (landmarker && countdown === 0 && !finished) {
              const results = landmarker.detectForVideo(
                videoRef.current,
                performance.now()
              );

              if (results.landmarks && results.landmarks.length > 0) {
                const lm = results.landmarks[0];

                const leftHeel = lm[29];
                const rightHeel = lm[30];
                const leftToe = lm[31];
                const rightToe = lm[32];

                // Heel-to-toe checks
                if (leftHeel && rightToe) {
                  const gap = Math.abs(leftHeel.x - rightToe.x);
                  setLeftHeelRightToeGap(gap);
                  ctx.fillStyle = "red";
                  [leftHeel, rightToe].forEach((p) => {
                    ctx.beginPath();
                    ctx.arc(
                      p.x * canvasRef.current!.width,
                      p.y * canvasRef.current!.height,
                      8,
                      0,
                      2 * Math.PI
                    );
                    ctx.fill();
                  });
                }

                if (rightHeel && leftToe) {
                  const gap = Math.abs(rightHeel.x - leftToe.x);
                  setRightHeelLeftToeGap(gap);
                  ctx.fillStyle = "blue";
                  [rightHeel, leftToe].forEach((p) => {
                    ctx.beginPath();
                    ctx.arc(
                      p.x * canvasRef.current!.width,
                      p.y * canvasRef.current!.height,
                      8,
                      0,
                      2 * Math.PI
                    );
                    ctx.fill();
                  });
                }

                // Balance (shoulder tilt)
                const leftShoulder = lm[11];
                const rightShoulder = lm[12];
                if (leftShoulder && rightShoulder) {
                  const tilt = Math.abs(leftShoulder.y - rightShoulder.y);
                  const isUnstable = tilt > 0.1;
                  setUnstable(isUnstable);

                  if (isUnstable && !balanceErrorActive.current) {
                    setErrorCount((prev) => prev + 1);
                    balanceErrorActive.current = true;
                  }
                }

                // Arms for balance
                const leftWrist = lm[15];
                const rightWrist = lm[16];
                const leftHip = lm[23];
                const rightHip = lm[24];
                if (leftWrist && rightWrist && leftHip && rightHip) {
                  const leftArmDist = Math.abs(leftWrist.x - leftHip.x);
                  const rightArmDist = Math.abs(rightWrist.x - rightHip.x);
                  const isUsingArms = leftArmDist > 0.15 || rightArmDist > 0.15;
                  setUsingArms(isUsingArms);

                  if (isUsingArms && !armsErrorActive.current) {
                    setErrorCount((prev) => prev + 1);
                    armsErrorActive.current = true;
                  }
                }

                // Heel error (both gaps bad)
                if (leftHeel && rightToe && rightHeel && leftToe) {
                  const gap1 = Math.abs(leftHeel.x - rightToe.x);
                  const gap2 = Math.abs(rightHeel.x - leftToe.x);
                  const heelError = gap1 > 0.05 && gap2 > 0.05;

                  if (heelError && !heelErrorActive.current) {
                    setErrorCount((prev) => prev + 1);
                    heelErrorActive.current = true;
                  }
                }
              }
            }
          }
          requestAnimationFrame(render);
        };
        render();
      }
    };

    init();
  }, [countdown, finished]);

  const handleStart = () => {
    setTestStarted(true);
    setFinished(false);
    setCountdown(3);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev > 0) return prev - 1;
        clearInterval(interval);
        return 0; // countdown finished
      });
    }, 1000);
  };

  const handleStop = () => {
    setFinished(true);

    localStorage.setItem(
      "heelToeResult",
      JSON.stringify({
        errors: errorCount,
        pass: errorCount < 2, // you can tweak threshold
        accuracy: 68,
      })
    );
    console.log("Final Errors:", errorCount);
    const timeout = setTimeout(() => {
      router.push("/SlurredWords");
    }, 5000);
    return () => clearTimeout(timeout);
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white px-4 overflow-hidden">
      <Card className="w-full max-w-3xl bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-indigo-400">
            Heel-to-Toe Walk Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Instructions */}
          <p className="text-gray-300 mb-4">
            <strong>How to perform:</strong> Stand up and walk nine steps in a
            straight line, placing your heel directly in front of your toe each
            step. Keep your arms at your sides and maintain balance. After nine
            steps, turn around and return in the same manner.
          </p>

          {/* Camera & canvas */}
          <video ref={videoRef} className="hidden" />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="rounded-lg border-4 border-indigo-600 shadow-lg w-full"
          />

          {/* Buttons / countdown */}
          {!testStarted && (
            <Button
              onClick={handleStart}
              size="lg"
              className="mt-6 bg-indigo-600 hover:bg-indigo-700"
            >
              Start Test
            </Button>
          )}

          {testStarted && countdown !== null && countdown > 0 && (
            <p className="mt-6 text-2xl text-yellow-400">
              Starting in: {countdown}
            </p>
          )}

          {testStarted && countdown === 0 && !finished && (
            <Button
              onClick={handleStop}
              size="lg"
              variant="destructive"
              className="mt-6"
            >
              Stop Test
            </Button>
          )}

          {/* Live results */}
          {testStarted && countdown === 0 && !finished && (
            <div className="mt-4 space-y-2">
              {leftHeelRightToeGap !== null && (
                <p className="text-white">
                  Left Heel → Right Toe Gap: {leftHeelRightToeGap.toFixed(3)}{" "}
                  {leftHeelRightToeGap < 0.05 ? "✅ PASS" : "❌ FAIL"}
                </p>
              )}
              {rightHeelLeftToeGap !== null && (
                <p className="text-white">
                  Right Heel → Left Toe Gap: {rightHeelLeftToeGap.toFixed(3)}{" "}
                  {rightHeelLeftToeGap < 0.05 ? "✅ PASS" : "❌ FAIL"}
                </p>
              )}
              <p className="text-white">
                Balance: {unstable ? "❌ Unstable" : "✅ Stable"}
              </p>
              <p className="text-white">
                Arms: {usingArms ? "❌ Using arms" : "✅ Arms steady"}
              </p>
            </div>
          )}

          {/* Completion */}
          {finished && (
            <h2 className="mt-6 text-2xl font-bold text-indigo-400">
              ✅ Test complete.
            </h2>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default HeelToeTest;
