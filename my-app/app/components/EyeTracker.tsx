"use client";

import React, { useEffect, useRef, useState } from "react";

const EyeTracker: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isTracking, setIsTracking] = useState(false);
  const [eyeData, setEyeData] = useState<any>(null);

  // Timer + test control
  const [testStarted, setTestStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  // History + metrics
  const [history, setHistory] = useState<{ x: number; t: number }[]>([]);
  const [smoothness, setSmoothness] = useState<number | null>(null);
  const [jerkiness, setJerkiness] = useState<number | null>(null);

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

      // Only record iris positions if test is running
      if (testStarted && data.leftIris && data.leftIris.length > 0) {
        const now = Date.now() / 1000; // seconds
        const x = data.leftIris[0][0]; // normalized X
        setHistory((prev) => {
          const updated = [...prev, { x, t: now }];
          return updated.slice(-50); // keep last 50 frames
        });
      }
    };

    return () => {
      ws.close();
    };
  }, [testStarted]);

  // --- Calculate smoothness & jerkiness from history ---
  useEffect(() => {
    if (history.length < 3) return;

    const velocities: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const dx = history[i].x - history[i - 1].x;
      const dt = history[i].t - history[i - 1].t;
      if (dt > 0) velocities.push(dx / dt);
    }

    if (velocities.length > 2) {
      const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
      const variance =
        velocities.reduce((sum, v) => sum + (v - mean) ** 2, 0) /
        velocities.length;
      const stdDev = Math.sqrt(variance);

      const spikes = velocities.map((v, i, arr) =>
        i > 0 ? Math.abs(v - arr[i - 1]) : 0
      );
      const maxSpike = Math.max(...spikes);

      setSmoothness(stdDev);
      setJerkiness(maxSpike);
    }
  }, [history]);

  // --- Countdown timer logic ---
  useEffect(() => {
    if (!testStarted) return;

    if (timeLeft <= 0) {
      setTestStarted(false); // stop test automatically
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, timeLeft]);

  // --- Drawing loop (mirrored video + iris points) ---
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

      // Draw iris points
      if (eyeData) {
        const drawIrisPoints = (points: [number, number][], color: string) => {
          ctx.fillStyle = color;
          points.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x * canvas.width, y * canvas.height, 2, 0, 2 * Math.PI);
            ctx.fill();
          });
        };

        if (eyeData.leftIris) drawIrisPoints(eyeData.leftIris, "red");
        if (eyeData.rightIris) drawIrisPoints(eyeData.rightIris, "green");
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

  // --- Start test button handler ---
  const startTest = () => {
    setTestStarted(true);
    setTimeLeft(10);
    setHistory([]);
    setSmoothness(null);
    setJerkiness(null);
  };

  return (
    <div className="flex flex-col items-center py-12">
      <div className="relative w-full max-w-md">
        {/* Status badge */}
        <div
          className={`absolute top-4 left-4 px-3 py-1 rounded-full ${
            isTracking ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {isTracking ? "Tracking" : "Not Connected"}
        </div>

        {/* Hidden video element */}
        <video
          ref={videoRef}
          width={640}
          height={480}
          autoPlay
          playsInline
          muted
          className="hidden"
        />

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="rounded-lg border-4 border-indigo-600 shadow-lg w-full"
        />

        {/* Timer */}
        <div className="text-center mt-4 text-white">
          {testStarted ? (
            <p className="text-xl">Time Left: {timeLeft}s</p>
          ) : (
            <button
              onClick={startTest}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700"
            >
              Start 10s Test
            </button>
          )}
        </div>

        {/* Results */}
        <div className="mt-4 text-center text-white">
          {smoothness !== null && <p>Smoothness: {smoothness.toFixed(4)}</p>}
          {jerkiness !== null && <p>Jerkiness: {jerkiness.toFixed(4)}</p>}
        </div>
      </div>
    </div>
  );
};

export default EyeTracker;
