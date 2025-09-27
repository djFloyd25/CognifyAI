import React from "react";
import CameraFeed from "@/components/CameraFeed";

const TestPage: React.FC = () => {
    return (
        <main className="bg-gray-900 min-h-screen text-white flex flex-col items-center justify-center">
            <h1 className="text-4xl font-bold mb-6">Sobriety Test</h1>
            <CameraFeed />
        </main>
    );
};

export default TestPage;