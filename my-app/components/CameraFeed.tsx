"use client";

import React, { useEffect, useRef } from "react";

const CameraFeed: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Request access to the back camera
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing camera: ", err);
      });
  }, []);

  return (
    <div className="flex justify-center items-center py-12">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-11/12 max-w-md h-auto rounded-lg border-4 border-indigo-600 shadow-lg"
      />
    </div>
  );
};

export default CameraFeed;
