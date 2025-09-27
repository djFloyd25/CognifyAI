"use client";

import React, { useEffect, useRef, useState } from "react";

const EyeTracker: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [eyePositions, setEyePositions] = useState<{
    leftIris: [number, number][];
    rightIris: [number, number][];
  } | null>(null);

  // Initialize webcam
  useEffect(() => {
    if (!videoRef.current) return;

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 } 
        });
        videoRef.current!.srcObject = stream;
        await videoRef.current!.play();
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    startWebcam();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Connect to WebSocket server
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
      setIsTracking(true);
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket server");
      setIsTracking(false);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEyePositions(data);
    };

    setWebsocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  // Draw video and tracking points
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video feed
      ctx.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);

      // Draw iris points if available
      if (eyePositions) {
        const drawIrisPoints = (points: [number, number][], color: string) => {
          ctx.fillStyle = color;
          points.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x * canvas.width, y * canvas.height, 2, 0, 2 * Math.PI);
            ctx.fill();
          });
        };

        drawIrisPoints(eyePositions.leftIris, "red");
        drawIrisPoints(eyePositions.rightIris, "green");
      }

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [eyePositions]);

  return (
    <div className="flex justify-center items-center py-12">
      <div className="relative w-full max-w-md">
        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full ${
          isTracking ? "bg-green-500" : "bg-red-500"
        }`}>
          {isTracking ? "Tracking" : "Not Connected"}
        </div>
        {/* Hidden video element for webcam capture */}
        <video
          ref={videoRef}
          width={640}
          height={480}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        {/* Canvas for drawing video and tracking points */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="rounded-lg border-4 border-indigo-600 shadow-lg w-full"
        />
      </div>
    </div>
  );
};

export default EyeTracker;