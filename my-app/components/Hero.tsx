import React from "react";
import { Button } from "@/components/ui/button";

const Hero: React.FC = () => {
  return (
    <section className="w-full bg-gray-900 text-white flex flex-col items-center justify-center py-32 px-6 text-center">
      <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
        Welcome to CognifyAI
      </h1>
      <p className="text-lg md:text-xl text-gray-300 max-w-xl mb-8">
        Test your cognitive abilities in a fun and interactive way. See how alert and focused you really are!
      </p>
      <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
        Start the Test
      </Button>
    </section>
  );
};

export default Hero;
