import { useEffect, useRef, useState } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

export function usePoseDetection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState<string>("Loading...");

  useEffect(() => {
    let poseLandmarker: PoseLandmarker;
    let animationFrameId: number;

    const init = async () => {
      try {
        // Load MediaPipe runtime
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );

        // Initialize Pose model
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });

        setIsReady(true);
        setStatus("Ready");

        // Start webcam
        if (!videoRef.current) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Render loop
        const render = async () => {
          if (videoRef.current && canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d")!;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            ctx.drawImage(
              videoRef.current,
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );

            // Run pose detection
            const results = poseLandmarker.detectForVideo(
              videoRef.current,
              performance.now()
            );

            if (results.landmarks.length > 0) {
              const drawingUtils = new DrawingUtils(ctx);
              drawingUtils.drawLandmarks(results.landmarks[0], {
                color: "red",
                lineWidth: 2,
              });
              drawingUtils.drawConnectors(
                results.landmarks[0],
                PoseLandmarker.POSE_CONNECTIONS,
                { color: "lime", lineWidth: 2 }
              );

              setStatus("Analyzing...");
            }
          }
          animationFrameId = requestAnimationFrame(render);
        };
        render();
      } catch (e: any) {
        console.error("❌ MediaPipe init failed", e);
        setStatus("Error loading MediaPipe");
      }
    };

    init();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return { videoRef, canvasRef, isReady, status };
}
