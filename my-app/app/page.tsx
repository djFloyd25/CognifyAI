import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";

export default function Page() {
  return (
    <main className="bg-gray-900 min-h-screen">
      <Navbar />
      <Hero />
      {/* You can add Features, Footer, etc. below */}
    </main>
  );
}
