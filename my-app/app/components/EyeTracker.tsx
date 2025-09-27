"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EyeTracker: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const router = useRouter();

  const [isTracking, setIsTracking] = useState(false);
  const [eyeData, setEyeData] = useState<any>(null);
  const [testStarted, setTestStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [history, setHistory] = useState<{ x: number; t: number }[]>([]);
  const [firstJerkPos, setFirstJerkPos] = useState<number | null>(null);
  const [jerkDetected, setJerkDetected] = useState(false);
  const [passFail, setPassFail] = useState<string | null>(null);

  const [isFrontCamera, setIsFrontCamera] = useState(true);

  // --- Start webcam ---
  useEffect(() => {
    const startWebcam = async () => {
      if (!videoRef.current) return;

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: { exact: "environment" } },
          });
          setIsFrontCamera(false);
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
          });
          setIsFrontCamera(true);
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (err: any) {
        console.error("Camera error:", err.name, err.message);
      }
    };

    startWebcam();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | undefined;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // --- WebSocket for eye tracking ---
  useEffect(() => {
    const ws = new WebSocket("ws://100.66.12.76:8000/ws/eye");

    ws.onopen = () => setIsTracking(true);
    ws.onclose = () => setIsTracking(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEyeData({ leftIris: data.leftIris, rightIris: data.rightIris, status: data.status });

      if (testStarted && data.leftIris && data.leftIris.length > 0) {
        const now = Date.now() / 1000;
        const x = data.leftIris[0][0];
        setHistory((prev) => [...prev, { x, t: now }].slice(-50));
      }
    };

    return () => ws.close();
  }, [testStarted]);

  // --- Detect jerks based on acceleration ---
  useEffect(() => {
    if (history.length < 3 || jerkDetected) return;

    const velocities: number[] = [];
    const accelerations: number[] = [];

    for (let i = 1; i < history.length; i++) {
      const dx = history[i].x - history[i - 1].x;
      const dt = history[i].t - history[i - 1].t;
      if (dt > 0) velocities.push(dx / dt);
    }

    for (let i = 1; i < velocities.length; i++) {
      const dv = velocities[i] - velocities[i - 1];
      const dt = history[i + 1].t - history[i].t;
      if (dt > 0) accelerations.push(dv / dt);
    }

    const jerkThreshold = 1.5; // adjust based on testing
    for (let i = 0; i < accelerations.length; i++) {
      if (Math.abs(accelerations[i]) > jerkThreshold) {
        setFirstJerkPos(history[i].x);
        setJerkDetected(true);
        break;
      }
    }
  }, [history, jerkDetected]);

  // --- Countdown timer ---
  useEffect(() => {
    if (!testStarted) return;
    if (timeLeft <= 0) {
      setTestStarted(false);
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [testStarted, timeLeft]);

  // --- Drawing loop ---
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      if (isFrontCamera) ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current!, isFrontCamera ? -canvas.width : 0, 0, canvas.width, canvas.height);
      ctx.restore();

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
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [eyeData, isFrontCamera]);

  const startTest = () => {
    setTestStarted(true);
    setTimeLeft(10);
    setHistory([]);
    setFirstJerkPos(null);
    setJerkDetected(false);
    setPassFail(null);
  };

  // --- Decide pass/fail based on jerk onset ---
  useEffect(() => {
    if (timeLeft === 0 && testStarted === false) {
      if (firstJerkPos !== null && firstJerkPos > 0.5) {
        setPassFail("✅ Eye Test Passed");
      } else {
        setPassFail("❌ Eye Test Failed");
      }

      // Optional: navigate after short delay
      setTimeout(() => router.push("/walk-and-turn"), 5000);
    }
  }, [timeLeft, testStarted, firstJerkPos, router]);

  return (
    <div className="flex flex-col items-center py-12">
      <div className="relative w-full max-w-md">
        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full ${isTracking ? "bg-green-500" : "bg-red-500"}`}>
          {isTracking ? "Tracking" : "Not Connected"}
        </div>

        <video ref={videoRef} width={640} height={480} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} width={640} height={480} className="rounded-lg border-4 border-indigo-600 shadow-lg w-full" />

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

        <div className="mt-4 text-center text-white">
          {jerkDetected && firstJerkPos !== null && <p>First jerk detected at x = {firstJerkPos.toFixed(2)}</p>}
          {passFail && <h2 className="text-2xl font-bold mt-4">{passFail}</h2>}
        </div>
      </div>
    </div>
  );
};

export default EyeTracker;
