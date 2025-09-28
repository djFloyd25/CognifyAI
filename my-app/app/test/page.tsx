import React from "react";
import EyeTracker from "@/app/components/EyeTracker";

const TestPage: React.FC = () => {
  return (
    <main className="bg-gray-900 min-h-screen text-white flex flex-col items-center justify-center">
      <EyeTracker />
    </main>
  );
};

export default TestPage;
