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
  const [smoothness, setSmoothness] = useState<number | null>(null);
  const [jerkiness, setJerkiness] = useState<number | null>(null);
  const [passFail, setPassFail] = useState<string | null>(null);

  // Detect front vs back camera
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  // --- Start webcam with back camera if available ---
  useEffect(() => {
    const startWebcam = async () => {
      if (!videoRef.current) return;

      try {
        let stream: MediaStream;

        try {
          // Try back camera first
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: 640,
              height: 480,
              facingMode: { exact: "environment" },
            },
          });
          setIsFrontCamera(false); // Using back camera
        } catch {
          // Fallback to front camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: 640,
              height: 480,
              facingMode: "user",
            },
          });
          setIsFrontCamera(true); // Using front camera
        }

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        console.log(`✅ Camera started (${isFrontCamera ? "front" : "back"})`);
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
    const ws = new WebSocket("ws://100.66.12.76:8000/ws/eye");

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

      if (testStarted && data.leftIris && data.leftIris.length > 0) {
        const now = Date.now() / 1000;
        const x = data.leftIris[0][0];
        setHistory((prev) => [...prev, { x, t: now }].slice(-50));
      }
    };

    return () => ws.close();
  }, []);

  // --- Calculate smoothness & jerkiness ---
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
      console.log(`Smoothness: ${stdDev.toFixed(4)}, Jerkiness: ${maxSpike.toFixed(4)}`);
    }
  }, [history]);

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
      // Mirror only if front camera
      if (isFrontCamera) ctx.scale(-1, 1);
      ctx.drawImage(
        videoRef.current!,
        isFrontCamera ? -canvas.width : 0,
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
      if (animationFrameRef.current !== null)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [eyeData, isFrontCamera]);

  const startTest = () => {
    setTestStarted(true);
    setTimeLeft(10);
    setHistory([]);
    setSmoothness(null);
    setJerkiness(null);
    setPassFail(null);
  };

  // --- Pass/Fail Logic ---
  useEffect(() => {
    if (timeLeft === 0 && testStarted) {
      const smoothnessThreshold = 0.1; // lower = smoother
      const jerkinessThreshold = 0.2; // lower = less jerky

      if (
        smoothness !== null &&
        jerkiness !== null
      ) {
        if (smoothness < smoothnessThreshold &&
        jerkiness < jerkinessThreshold){
          setPassFail("✅ Eye Test Passed");
        } else {
          setPassFail("❌ Eye Test Failed");
        }
      }
      else {
        setPassFail("❌ Eye Test Failed(insufficient data)");
      }

      setTimeout(() => router.push("/walk-and-turn"), 5000);
    }
  }, [timeLeft, testStarted, smoothness, jerkiness, router]);

  return (
    <div className="flex flex-col items-center py-12">
      <div className="relative w-full max-w-md">
        <div
          className={`absolute top-4 left-4 px-3 py-1 rounded-full ${
            isTracking ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {isTracking ? "Tracking" : "Not Connected"}
        </div>

        <video
          ref={videoRef}
          width={640}
          height={480}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="rounded-lg border-4 border-indigo-600 shadow-lg w-full"
        />

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
          {smoothness !== null && (
            <p>Smoothness: {smoothness.toFixed(4)}</p>
          )}
          {jerkiness !== null && <p>Jerkiness: {jerkiness.toFixed(4)}</p>}
          {passFail && (
            <h2 className="text-2xl font-bold mt-4">{passFail}</h2>
          )}
        </div>
      </div>
    </div>
  );
};

export default EyeTracker;
