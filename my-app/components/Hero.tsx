import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const Hero: React.FC = () => {
  return (
    <section className="w-full bg-gray-900 text-white flex flex-col items-center justify-center py-32 px-6 text-center">
      {/* Title & Subtitle */}
      <h1 className="text-5xl md:text-6xl font-extrabold mb-6 ">
        Welcome to <span className="text-indigo-500">CognifyAI</span>
      </h1>
      <p className="text-lg md:text-xl text-gray-300 max-w-xl mb-8">
        Test your cognitive abilities in a fun and interactive way. See how
        alert and focused you really are!
      </p>

      {/* CTA */}
      <Link href="/test">
        <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
          Start Test
        </Button>
      </Link>

      {/* Drinking Facts Section */}
      <div className="mt-16 grid gap-6 md:grid-cols-3 w-full max-w-5xl">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl text-indigo-400">
              Fact 1: Reaction Time
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300">
            Alcohol slows down your brain’s communication pathways. Even small
            amounts can reduce reaction time by up to{" "}
            <span className="font-bold">25%</span>.
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl text-indigo-400">
              Fact 2: Balance & Coordination
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300">
            Impaired balance and coordination are classic signs of intoxication.
            Walking heel-to-toe becomes significantly harder after just a few
            drinks.
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl text-indigo-400">
              Fact 3: Speech
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300">
            Slurred speech occurs when alcohol affects the cerebellum and motor
            control areas of the brain. This is one of the earliest visible
            indicators of intoxication.
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Hero;
