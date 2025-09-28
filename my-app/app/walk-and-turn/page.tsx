"use client";

import React, { useEffect, useRef, useState } from "react";

const WalkAndTurn: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [walkData, setWalkData] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Start webcam
  useEffect(() => {
    const startWebcam = async () => {
      if (!videoRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    };
    startWebcam();
  }, []);

  // Connect WebSocket
  useEffect(() => {
    const ws = new WebSocket("ws://100.66.12.76:8000/ws/walk");

    ws.onopen = () => setIsTracking(true);
    ws.onclose = () => setIsTracking(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWalkData(data);
    };

    return () => ws.close();
  }, []);

  // Drawing loop
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);

      if (walkData) {
        const drawPoint = ([x, y]: [number, number], color: string) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x * canvas.width, y * canvas.height, 5, 0, 2 * Math.PI);
          ctx.fill();
        };

        if (walkData.leftAnkle) drawPoint(walkData.leftAnkle, "red");
        if (walkData.rightAnkle) drawPoint(walkData.rightAnkle, "green");
        if (walkData.leftHip) drawPoint(walkData.leftHip, "blue");
        if (walkData.rightHip) drawPoint(walkData.rightHip, "blue");
        if (walkData.leftWrist) drawPoint(walkData.leftWrist, "yellow");
        if (walkData.rightWrist) drawPoint(walkData.rightWrist, "yellow");
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
    <div className="flex flex-col items-center py-12">
      <div
        className={`absolute top-4 left-4 px-3 py-1 rounded-full ${
          isTracking ? "bg-green-500" : "bg-red-500"
        }`}
      >
        {isTracking ? "Tracking" : "Not Connected"}
      </div>

      <video ref={videoRef} className="hidden" />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="rounded-lg border-4 border-indigo-600 shadow-lg w-full"
      />

      <div className="mt-4 text-white">
        <p>Status: {walkData?.status}</p>
      </div>
    </div>
  );
};

export default WalkAndTurn;
