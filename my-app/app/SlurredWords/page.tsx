"use client";

import React, { useEffect, useState } from "react";
import leven from "leven";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const router = useRouter();

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
      const pass = similarity > 80;

      const verdict = pass
        ? "✅ Clear Speech!"
        : "❌ Slurred or Incorrect Words!";
      setResult(verdict);

      // 👉 Save result to localStorage
      localStorage.setItem(
        "slurredSpeechResult",
        JSON.stringify({
          transcript: text,
          expected: currentPhrase,
          similarity: similarity.toFixed(1),
          pass,
          accuracy: 60, // placeholder until you decide
        })
      );

      // 👉 Redirect after 5s
      setTimeout(() => {
        router.push("/FinalResults");
      }, 5000);
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
    <main className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white px-4 overflow-hidden">
      <Card className="w-full max-w-3xl bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-indigo-400">
            Slurred Words Test
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {/* Instructions */}
          <p className="text-gray-300 mb-4 text-center">
            <strong>How to perform:</strong> Read the displayed phrase aloud
            clearly. Try to articulate each word carefully and at a normal pace.
          </p>

          {/* Phrase to repeat */}
          <p className="text-2xl italic mb-8 text-center">{currentPhrase}</p>

          {/* Start button */}
          <Button
            onClick={startListening}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 mb-6"
            disabled={listening}
          >
            {listening ? "Listening..." : "Start Listening"}
          </Button>

          {/* Transcript box */}
          {transcript && (
            <div className="mt-6 p-4 bg-gray-700 rounded shadow w-full max-w-md text-center">
              <p className="font-bold">You said:</p>
              <p className="text-gray-200">{transcript}</p>
            </div>
          )}

          {/* Result */}
          {showResult && (
            <h1 className="text-4xl font-bold mb-6 py-10">{result}</h1>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default SlurredWords;
