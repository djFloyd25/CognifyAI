"use client";

import React, {useState} from "react";

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

const SlurredWords = () => {
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState("");

    const startListening = () => {
        const SpeechRecognition = 
            window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser does not support Speech Recognition.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onStart = () => {
            setListening(true);
        };

        recognition.onResult = (event: any) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            setListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setListening(false);
        };

        recognition.onend = () => {
            setListening(false);
        };

        recognition.start();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <h1 className="text-4xl font-bold mb-6">Slurred Words Test</h1>
            <p className="mb-4"> Please repeat the phrase below clearly:</p>
            <p className="text-2xl italic mb-8">"The quick brown fox jumps over the lazy dog."</p>

            <button
                onClick={startListening}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-6"
                disabled={listening}
            >
                {listening ? "Listening..." : "Start Listening"}
            </button> 

            {transcript && (
                <div className="mt-6 p-4 bg-white rounded shadow w-full max-w-md text-center">
                    <p className="font-bold">You said:</p>
                    <p>{transcript}</p>
                </div>
            )}

        </div>
    );

};

export default SlurredWords;