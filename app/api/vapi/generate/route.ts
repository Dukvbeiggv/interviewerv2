import { generateText } from "ai";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid } = await request.json();

  try {
    // Use the OpenRouter API directly
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API key is not set");
    }

    // Call OpenRouter API directly
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku:beta",
        messages: [
          {
            role: "user",
            content: `Prepare questions for a job interview.
              The job role is ${role}.
              The job experience level is ${level}.
              The tech stack used in the job is: ${techstack}.
              The focus between behavioural and technical questions should lean towards: ${type}.
              The amount of questions required is: ${amount}.
              Please return only the questions, without any additional text.
              The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
              Return the questions formatted like this:
              ["Question 1", "Question 2", "Question 3"]
              
              Thank you! <3
            `,
          },
        ],
      }),
    });

    const result = await response.json();
    const questionsStr = result.choices[0]?.message?.content;
    const questions = JSON.parse(questionsStr);

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(","),
      questions: questions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
