import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();
  const { score, errors, similarity } = body;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini", 
    messages: [
      {
        role: "system",
        content:
          "You are a medical assistant. Provide advice about sobriety tests. Do not diagnose conditions.",
      },
      {
        role: "user",
        content: `Here are the test results:
        - Horizontal Gaze Score: ${score}
        - Walk & Turn Errors: ${errors}
        - Speech Similarity: ${similarity}%

        Based on these results, inform the user on whether they are in the shape to drive, do daily tasks, and how they could sober up if needed. Limit your response to 3-4 bulleted points.`,
      },
    ],
  });

  const advice = completion.choices[0].message.content;
  return NextResponse.json({ advice });
}
