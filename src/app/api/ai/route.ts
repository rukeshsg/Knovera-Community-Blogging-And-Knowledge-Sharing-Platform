import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { text, action } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Since we don't have an OpenAI API key set up, we simulate the AI processing.
    // Replace this logic with actual OpenAI or Gemini calls once API keys are provided in .env.local
    let transformedText = text;

    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (action === "improve") {
      transformedText = `✨ ${text} (Improved by AI for better clarity and flow)`;
    } else if (action === "summarize") {
      transformedText = `📝 Summary: ${text.substring(0, 50)}...`;
    } else if (action === "grammar") {
      // Basic mock grammar fix: capitalize first letter and ensure it ends with a period.
      const fixed = text.charAt(0).toUpperCase() + text.slice(1);
      transformedText = fixed.endsWith(".") ? fixed : fixed + ".";
    }

    return NextResponse.json({ result: transformedText });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 });
  }
}
