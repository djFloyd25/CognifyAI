"use client";

import React, { useEffect, useState } from "react";

const WalkAndTurn: React.FC = () => {
  const [walkData, setWalkData] = useState<any>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/walk");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWalkData(data);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-6">Walk and Turn Test</h1>
      <p className="mb-4 text-lg">
        Follow the instructions to complete the walk-and-turn sobriety test.
      </p>

      {walkData ? (
        <div className="bg-gray-800 p-4 rounded shadow-md w-96 text-center">
          <p>
            Status:{" "}
            <span
              className={
                walkData.status.includes("PASS")
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {walkData.status}
            </span>
          </p>
          <p>Alignment: {walkData.alignment?.toFixed(3)}</p>
          <p>Stability: {walkData.stability?.toFixed(3)}</p>
        </div>
      ) : (
        <p>Waiting for walk test data...</p>
      )}
    </div>
  );
};

export default WalkAndTurn;
