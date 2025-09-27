import React from "react";
import EyeTracker from "@/app/components/EyeTracker";

const TestPage: React.FC = () => {
    return (
        <main className="bg-gray-900 min-h-screen text-white flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-6">Sobriety Test</h1>
            <EyeTracker />
        </main>
    );
};

export default TestPage;