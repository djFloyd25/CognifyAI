"use client";

import React, { useEffect, useState } from "react";
import leven from "leven";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const phrases = [
  "The quick brown fox jumps over the lazy dog",
  "She sells seashells by the seashore",
  "How can a clam cram in a clean cream can?",
  "I scream, you scream, we all scream for ice cream!",
  "The rain in Spain stays mainly in the plain.",
];

const SlurredWords: React.FC = () => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState("");
  const [currentPhrase, setCurrentPhrase] = useState("");
  const [showResult, setShowResult] = useState(false);

  const getRandomPhrase = () => {
    const randomIndex = Math.floor(Math.random() * phrases.length);
    return phrases[randomIndex];
  };

  useEffect(() => {
    setCurrentPhrase(getRandomPhrase());
  }, []);

  const calculateSimilarity = (spoken: string, expected: string) => {
    const distance = leven(spoken.toLowerCase(), expected.toLowerCase());
    const maxLen = Math.max(spoken.length, expected.length);
    return (1 - distance / maxLen) * 100;
  };

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

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);

        const similarity = calculateSimilarity(text, currentPhrase);
            setResult(similarity > 80 ? "✅ Clear Speech!" : "❌ Slurred or Incorrect Words!");
        };

    recognition.onend = () => {
        setListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setListening(false);
    };


    recognition.start();

    // Stop automatically after 5 seconds
    setTimeout(() => recognition.stop(), 5000);

    setShowResult(false); // reset visibility
    setTimeout(() => setShowResult(true), 5000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-6">Slurred Words Test</h1>
      <p className="mb-4">Please repeat the phrase below clearly:</p>
      <p className="text-2xl italic mb-8">{currentPhrase}</p>

      <button
        onClick={startListening}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-6"
        disabled={listening}
      >
        {listening ? "Listening..." : "Start Listening"}
      </button>

      {transcript && (
        <div className="mt-6 p-4 bg-gray-800 rounded shadow w-full max-w-md text-center">
          <p className="font-bold">You said:</p>
          <p>{transcript}</p>
        </div>
      )}

      {showResult && (
        <h1 className="text-4xl font-bold mb-6 py-10">
            {result}
        </h1>
    )}
    </div>
  );
};

export default SlurredWords;
