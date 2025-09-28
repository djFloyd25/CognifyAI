"use client";

import React, { useEffect, useRef, useState } from "react";

const HGNTest: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [eyeData, setEyeData] = useState<any>(null);
  const [history, setHistory] = useState<{ x: number; t: number }[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const [testStarted, setTestStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [finalResult, setFinalResult] = useState<string | null>(null);

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
    const ws = new WebSocket("ws://localhost:8000/ws/eye");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setEyeData(data);

      if (testStarted && data.leftIris?.length > 0 && timeLeft > 1) {
        const now = Date.now() / 1000;
        const x = data.leftIris[0][0]; // use X position
        setHistory((prev) => [...prev, { x, t: now }].slice(-50));
      }
    };

    return () => ws.close();
  }, [testStarted, timeLeft]);

  // Calculate score (smoothness/jerkiness)
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
      const stdDev = Math.sqrt(variance); // smoothness
      const spikes = velocities.map((v, i, arr) =>
        i > 0 ? Math.abs(v - arr[i - 1]) : 0
      );
      const maxSpike = Math.max(...spikes); // jerkiness

      const newScore = Math.max(0, 100 - stdDev * 50 - maxSpike * 200);
      setScore(newScore);
    }
  }, [history]);

  // Timer logic
  useEffect(() => {
    if (!testStarted) return;
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, timeLeft]);

  // Final result 1 second before test ends
  useEffect(() => {
    if (timeLeft === 1 && finalResult === null) {
      if (score !== null) {
        if (score >= 70) {
          setFinalResult("✅ PASS – Final score good");
        } else {
          setFinalResult("❌ FAIL – Nystagmus detected");
        }
      } else {
        setFinalResult("❌ FAIL – No data collected");
      }
    }
  }, [timeLeft, score, finalResult]);

  // Drawing loop
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (videoRef.current && videoRef.current.readyState === 4) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }

      if (eyeData) {
        const drawIris = (points: [number, number][], color: string) => {
          ctx.fillStyle = color;
          points.forEach(([x, y]) => {
            const flippedX = canvas.width - x * canvas.width; // 👈 mirror
            ctx.beginPath();
            ctx.arc(flippedX, y * canvas.height, 4, 0, 2 * Math.PI);
            ctx.fill();
          });
        };

        if (eyeData.leftIris?.length > 0) drawIris(eyeData.leftIris, "red");
        if (eyeData.rightIris?.length > 0) drawIris(eyeData.rightIris, "green");
      }

      requestAnimationFrame(render);
    };

    render();
  }, [eyeData]);

  const startTest = () => {
    setTestStarted(true);
    setTimeLeft(10); // 10s test
    setHistory([]);
    setScore(null);
    setFinalResult(null);
  };

  return (
    <div className="flex flex-col items-center py-12">
      <h1 className="text-3xl font-bold mb-4">
        Horizontal Gaze Nystagmus Test
      </h1>

      <video ref={videoRef} className="hidden" />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="rounded-lg border-4 border-indigo-600 shadow-lg"
      />

      {!testStarted ? (
        <button
          onClick={startTest}
          className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700"
        >
          Start 10s Test
        </button>
      ) : (
        <p className="mt-6 text-xl">Time Left: {timeLeft}s</p>
      )}

      {/* Live score while running */}
      {testStarted && score !== null && (
        <p className="mt-4 text-white">Live Score: {score.toFixed(1)}</p>
      )}

      {/* Final result 1s before the end */}
      {finalResult && (
        <h2
          className={`mt-6 text-2xl font-bold ${
            finalResult.includes("PASS") ? "text-green-500" : "text-red-500"
          }`}
        >
          {finalResult}
        </h2>
      )}
    </div>
  );
};

export default HGNTest;
