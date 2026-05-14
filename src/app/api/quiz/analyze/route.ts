import { NextResponse } from "next/server";
import type { QuizQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const ANALYZE_PROMPT = `You are a study coach. A student just completed a quiz and got some questions wrong.

Analyze the wrong answers and:
1. Identify 2-3 specific knowledge gaps (short noun phrases, e.g. "Regulatory body roles", "Bond valuation formulas")
2. Write a 2-sentence study suggestion — encouraging but honest

Respond with ONLY valid JSON, no prose, no markdown:
{"gaps":["gap1","gap2"],"suggestion":"Two sentence suggestion here."}`;

function extractJson(raw: string): string {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

export async function POST(request: Request) {
  let body: { wrong_questions?: QuizQuestion[]; total?: number; correct?: number };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { wrong_questions, total = 0, correct = 0 } = body;
  if (!Array.isArray(wrong_questions) || wrong_questions.length === 0) {
    return NextResponse.json({ gaps: [], suggestion: "" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });

  const questionSummary = wrong_questions
    .map((q, i) => `Q${i + 1}: ${q.question}\nCorrect: ${q.correct}. ${q.options?.[q.correct as keyof typeof q.options] ?? ""}`)
    .join("\n\n");

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        { role: "system", content: ANALYZE_PROMPT },
        { role: "user", content: `Score: ${correct}/${total}\n\nWrong questions:\n${questionSummary}` },
      ],
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    return NextResponse.json({ error: `Groq error: ${err}` }, { status: 502 });
  }

  const data = await groqRes.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(extractJson(raw));
    return NextResponse.json({
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      suggestion: typeof parsed.suggestion === "string" ? parsed.suggestion : "",
    });
  } catch {
    return NextResponse.json({ gaps: [], suggestion: "" });
  }
}
