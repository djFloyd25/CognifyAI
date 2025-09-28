"use client";

import React, { useEffect, useState } from "react";

const FinalResults: React.FC = () => {
  const [gaze, setGaze] = useState<any>(null);
  const [walk, setWalk] = useState<any>(null);
  const [speech, setSpeech] = useState<any>(null);
  const [uberUrl, setUberUrl] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string>("");

  useEffect(() => {
    const g = localStorage.getItem("gazeResult");
    const w = localStorage.getItem("heelToeResult");
    const s = localStorage.getItem("slurredSpeechResult");

    if (g) setGaze(JSON.parse(g));
    if (w) setWalk(JSON.parse(w));
    if (s) setSpeech(JSON.parse(s));
  }, []);

  const overallRisk = () => {
    let fails = 0;
    if (gaze && !gaze.pass) fails++;
    if (walk && !walk.pass) fails++;
    if (speech && !speech.pass) fails++;

    if (fails === 0) return "Low Risk ✅";
    if (fails === 1) return "Moderate Risk ⚠️";
    return "High Risk ❌";
  };

  useEffect(() => {
    if (gaze && walk && speech) {
      const fetchAdvice = async () => {
        const res = await fetch("/api/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: gaze.score,
            errors: walk.errors,
            similarity: speech.similarity,
          }),
        });
        const data = await res.json();
        setAdvice(data.advice);
      };
      fetchAdvice();
    }
  }, [gaze, walk, speech]);

  // Example dropoff: Times Square, NYC (use any safe location coords)
  const requestUber = () => {
    const lat = 40.758;
    const lng = -73.9855;
    const deeplink = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=Safe%20Destination`;
    window.open(deeplink, "_blank");
  };

  return (
    <main className="bg-gray-900 min-h-screen text-white flex flex-col items-center py-12 px-6">
      <h1 className="text-4xl font-bold mb-6">Final Results</h1>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl">
        {/* Left column: cards */}
        <div className="flex-1">
          {gaze && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-2">Horizontal Gaze</h2>
              <p>Score: {gaze.score?.toFixed(2) ?? "N/A"}</p>
              <p>Pass: {gaze.pass ? "✅" : "❌"}</p>
              <p>Accuracy: 77%</p>
            </div>
          )}

          {walk && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-2">Walk and Turn</h2>
              <p>Errors: {walk.errors}</p>
              <p>Pass: {walk.pass ? "✅" : "❌"}</p>
              <p>Accuracy: 68%</p>
            </div>
          )}

          {speech && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-2">Slurred Speech</h2>
              <p>Similarity: {speech.similarity}%</p>
              <p>Pass: {speech.pass ? "✅" : "❌"}</p>
              <p>Accuracy: {speech.accuracy ?? "TBD"}%</p>
            </div>
          )}

          <div className="mt-8 text-2xl font-bold text-indigo-400">
            Overall Risk: {overallRisk()}
          </div>

          {/* Uber button if high risk */}
          {overallRisk() === "High Risk ❌" && (
            <div className="mt-6">
              <button
                onClick={requestUber}
                className="px-6 py-3 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700"
              >
                Request an Uber Ride
              </button>
              {uberUrl && (
                <p className="mt-4">
                  <a
                    href={uberUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 underline"
                  >
                    Open in Uber
                  </a>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right column: advice placeholder */}
        <div className="flex-1 p-4 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-indigo-400">
            AI Medical-Style Advice
          </h2>
          {advice ? (
            <p className="text-gray-200 whitespace-pre-line">{advice}</p>
          ) : (
            <p className="text-gray-500">Analyzing results...</p>
          )}
        </div>
      </div>
    </main>
  );
};

export default FinalResults;
