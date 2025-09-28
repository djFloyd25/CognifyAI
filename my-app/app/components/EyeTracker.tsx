"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const HGNTest: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [eyeData, setEyeData] = useState<any>(null);
  const [history, setHistory] = useState<{ x: number; t: number }[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const [testStarted, setTestStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [finalResult, setFinalResult] = useState<string | null>(null);
  const router = useRouter();

  const smoothedX = useRef<number | null>(null);

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

      if (
        testStarted &&
        data.leftIris?.length > 0 &&
        data.rightIris?.length > 0 &&
        timeLeft > 1
      ) {
        const now = Date.now() / 1000;
        const xLeft = data.leftIris[0][0];
        const xRight = data.rightIris[0][0];
        const rawX = (xLeft + xRight) / 2;

        const SMOOTHING = 0.2;
        if (smoothedX.current == null) smoothedX.current = rawX;
        smoothedX.current =
          smoothedX.current * (1 - SMOOTHING) + rawX * SMOOTHING;

        setHistory((prev) =>
          [...prev, { x: smoothedX.current!, t: now }].slice(-50)
        );
      }
    };

    return () => ws.close();
  }, [testStarted, timeLeft]);

  // Calculate score
  useEffect(() => {
    if (history.length < 3) return;
    const velocities: number[] = [];
    for (let i = 1; i < history.length; i++) {
      let dt = history[i].t - history[i - 1].t;
      dt = Math.min(dt, 0.05);
      const dx = history[i].x - history[i - 1].x;
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
      const newScore = Math.max(0, 100 - stdDev * 50 - maxSpike * 200);
      setScore(newScore);
    }
  }, [history]);

  // Timer
  useEffect(() => {
    if (!testStarted) return;
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [testStarted, timeLeft]);

  // Final result 1s before test ends
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

  // Save result + redirect
  useEffect(() => {
    if (timeLeft === 0) {
      if (score !== null) {
        localStorage.setItem(
          "gazeResult",
          JSON.stringify({
            score: score,
            pass: score >= 70,
            accuracy: 50,
          })
        );
      }
      const timeout = setTimeout(() => {
        router.push("/walk-and-turn");
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [timeLeft, router, score]);

  // Drawing loop
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mirror the video
      if (videoRef.current && videoRef.current.readyState === 4) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(
          videoRef.current,
          -canvas.width,
          0,
          canvas.width,
          canvas.height
        );
        ctx.restore();
      }

      // Draw iris overlays WITHOUT flipping
      if (eyeData) {
        const drawIris = (points: [number, number][], color: string) => {
          ctx.fillStyle = color;
          points.forEach(([x, y]) => {
            ctx.beginPath();
            ctx.arc(x * canvas.width, y * canvas.height, 4, 0, 2 * Math.PI);
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
    setTimeLeft(10);
    setHistory([]);
    setScore(null);
    setFinalResult(null);
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white px-4 overflow-hidden">
      <Card className="w-full max-w-3xl bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-indigo-400">
            Horizontal Gaze Nystagmus Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300 mb-4">
            <strong>How to perform:</strong> Sit comfortably in front of your
            camera. Keep your head still and follow a target such as your finger
            only with your eyes. Try not to move your head or blink excessively
            during the test.
          </p>

          <video ref={videoRef} className="hidden" />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="rounded-lg border-4 border-indigo-600 shadow-lg w-full"
          />

          {!testStarted ? (
            <Button
              onClick={startTest}
              size="lg"
              className="mt-6 bg-indigo-600 hover:bg-indigo-700"
            >
              Start 10s Test
            </Button>
          ) : (
            <p className="mt-6 text-xl text-white">Time Left: {timeLeft}s</p>
          )}

          {testStarted && score !== null && (
            <Alert className="mt-4 bg-gray-700 border-gray-600 text-white">
              <AlertTitle>Live Score</AlertTitle>
              <AlertDescription className="text-white">
                {score.toFixed(1)}
              </AlertDescription>
            </Alert>
          )}

          {finalResult && (
            <h2
              className={`mt-6 text-2xl font-bold ${
                finalResult.includes("PASS") ? "text-green-500" : "text-red-500"
              }`}
            >
              {finalResult}
            </h2>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default HGNTest;
