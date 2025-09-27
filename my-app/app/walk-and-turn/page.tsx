"use client";

import React, { useEffect, useRef, useState } from "react";

const WalkAndTurn: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [walkData, setWalkData] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);

  // --- Start webcam ---
  useEffect(() => {
    const startWebcam = async () => {
      if (!videoRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    };
    startWebcam();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // --- Connect to WebSocket ---
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/walk");

    ws.onopen = () => setIsTracking(true);
    ws.onclose = () => setIsTracking(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWalkData(data);
    };

    return () => ws.close();
  }, []);

  // --- Drawing loop ---
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the camera frame
      ctx.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);

      // Draw landmarks + skeleton if available
      if (walkData?.landmarks) {
        const landmarks: [number, number][] = walkData.landmarks;

        // Draw all pose landmarks
        landmarks.forEach(([x, y]) => {
          ctx.fillStyle = "red";
          ctx.beginPath();
          ctx.arc(x * canvas.width, y * canvas.height, 4, 0, 2 * Math.PI);
          ctx.fill();
        });

        // Define skeleton connections
        const CONNECTIONS: [number, number][] = [
          [11, 12], // shoulders
          [23, 24], // hips
          [11, 23],
          [12, 24], // torso
          [11, 13],
          [13, 15], // left arm
          [12, 14],
          [14, 16], // right arm
          [23, 25],
          [25, 27],
          [27, 29],
          [29, 31], // left leg
          [24, 26],
          [26, 28],
          [28, 30],
          [30, 32], // right leg
        ];

        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;
        CONNECTIONS.forEach(([i, j]) => {
          const [x1, y1] = landmarks[i];
          const [x2, y2] = landmarks[j];
          ctx.beginPath();
          ctx.moveTo(x1 * canvas.width, y1 * canvas.height);
          ctx.lineTo(x2 * canvas.width, y2 * canvas.height);
          ctx.stroke();
        });
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [walkData]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white px-4">
      {/* Title + subtitle */}
      <h1 className="text-4xl font-bold mb-2">Walk and Turn Test</h1>
      <p className="mb-6 text-lg text-gray-300 text-center max-w-lg">
        Follow the instructions to complete the walk-and-turn sobriety test.
      </p>

      {/* Camera container */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-4 w-full max-w-2xl flex flex-col items-center">
        {/* Tracking badge */}
        <div
          className={`mb-2 px-3 py-1 rounded-full text-sm ${
            isTracking ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {isTracking ? "Tracking Active" : "Not Connected"}
        </div>

        {/* Canvas with video + skeleton overlay */}
        <canvas
          ref={canvasRef}
          width={480}
          height={360}
          className="rounded-lg border-4 border-indigo-600 shadow-md"
        />
        <video ref={videoRef} className="hidden" />

        {/* Status card */}
        <div className="mt-4 bg-gray-700 rounded-lg p-4 w-full text-center space-y-2">
          <p className="text-lg font-semibold">
            Status:{" "}
            <span
              className={
                walkData?.status?.includes("PASS")
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {walkData?.status || "Analyzing..."}
            </span>
          </p>

          {/* Debug values */}
          {walkData?.heel_to_toe_gap !== undefined && (
            <p className="text-sm text-gray-300">
              Heel-to-Toe Gap: {walkData.heel_to_toe_gap.toFixed(3)}
            </p>
          )}
          {walkData?.stability !== undefined && (
            <p className="text-sm text-gray-300">
              Stability: {walkData.stability.toFixed(3)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalkAndTurn;
