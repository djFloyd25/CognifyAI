"use client";

import React, { useEffect, useRef, useState } from "react";

const EyeTracker: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isTracking, setIsTracking] = useState(false);
  const [eyeData, setEyeData] = useState<{
    leftIris: [number, number][];
    rightIris: [number, number][];
    status?: string;
  } | null>(null);

  // --- Start webcam ---
  useEffect(() => {
    const startWebcam = async () => {
      if (!videoRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        console.log("✅ Camera stream acquired");
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (err: any) {
        console.error("❌ Camera error:", err.name, err.message);
      }
    };

    startWebcam();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // --- Connect to WebSocket backend ---
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/eye");

    ws.onopen = () => {
      console.log("✅ Connected to WebSocket server");
      setIsTracking(true);
    };

    ws.onclose = () => {
      console.log("🛑 Disconnected from WebSocket server");
      setIsTracking(false);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEyeData({
        leftIris: data.leftIris,
        rightIris: data.rightIris,
        status: data.status,
      });
    };

    return () => {
      ws.close();
    };
  }, []);

  // --- Drawing loop (mirrored video + raw iris) ---
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw mirrored video feed
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(
        videoRef.current!,
        -canvas.width,
        0,
        canvas.width,
        canvas.height
      );
      ctx.restore();

      // Draw iris points (UNMIRRORED → raw coordinates from backend)
      if (eyeData) {
        const drawIrisPoints = (points: [number, number][], color: string) => {
          ctx.fillStyle = color;
          points.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(
              x * canvas.width, // raw X (no mirror)
              y * canvas.height,
              2,
              0,
              2 * Math.PI
            );
            ctx.fill();
          });
        };

        drawIrisPoints(eyeData.leftIris, "red");
        drawIrisPoints(eyeData.rightIris, "green");
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [eyeData]);

  return (
    <div className="flex flex-col items-center py-12">
      <div className="relative w-full max-w-md">
        {/* Tracking status badge */}
        <div
          className={`absolute top-4 left-4 px-3 py-1 rounded-full ${
            isTracking ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {isTracking ? "Tracking" : "Not Connected"}
        </div>

        {/* Hidden video feed */}
        <video
          ref={videoRef}
          width={640}
          height={480}
          autoPlay
          playsInline
          muted
          className="hidden"
        />

        {/* Canvas for mirrored video + iris overlays */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="rounded-lg border-4 border-indigo-600 shadow-lg w-full"
        />

        {/* Debug JSON display */}
        {eyeData && (
          <pre className="mt-4 text-xs bg-gray-800 text-white p-2 rounded">
            {JSON.stringify(eyeData, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

export default EyeTracker;
