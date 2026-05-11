import { NextResponse } from "next/server";
import { getAdminUser, createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const PARSE_PROMPT = `You are a quiz parser. Extract ALL multiple-choice questions from the text below.

Rules:
- Extract questions exactly as written — do not rephrase or improve them
- Each question must have exactly 4 options labeled A, B, C, D
- Detect the correct answer from: inline markers (*, ✓, (correct)), answer lines ("Answer: B"), or answer keys
- If correct answer is undetectable, set "correct": "A"
- Set "chapter" to the nearest section/chapter heading above the question, or null
- Set "explanation" to any explanation text after the answer, or null
- Ignore instructions, titles, and non-question content
- If no questions found in this section, return empty array

Respond with ONLY valid JSON — no prose, no markdown fences:
{"questions":[{"sort_order":1,"question":"string","options":{"A":"string","B":"string","C":"string","D":"string"},"correct":"A","explanation":null,"chapter":null}]}`;

function extractJson(raw: string): string {
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bank_id?: string; chunk_text?: string; chunk_index?: number; sort_order_offset?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bank_id, chunk_text, chunk_index = 0, sort_order_offset = 0 } = body;

  if (!bank_id) return NextResponse.json({ error: "bank_id required" }, { status: 400 });
  if (!chunk_text) return NextResponse.json({ error: "chunk_text required" }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 4000,
      messages: [
        { role: "system", content: PARSE_PROMPT },
        {
          role: "user",
          content: `Extract all quiz questions from this section (chunk ${chunk_index + 1}):\n\n${chunk_text}`,
        },
      ],
    }),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    return NextResponse.json({ error: `Groq error: ${err}` }, { status: 502 });
  }

  const groqData = await groqRes.json();
  const raw: string = groqData?.choices?.[0]?.message?.content ?? "";
  const cleaned = extractJson(raw);

  let parsed: { questions: unknown[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Chunk had no parseable questions — not fatal, return 0
    return NextResponse.json({ questions_added: 0 });
  }

  const questions = parsed?.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ questions_added: 0 });
  }

  const rows = questions.map((q: unknown, i: number) => {
    const qObj = q as Record<string, unknown>;
    return {
      quiz_bank_id: bank_id,
      sort_order: sort_order_offset + i + 1,
      question: String(qObj.question ?? ""),
      options: qObj.options ?? { A: "", B: "", C: "", D: "" },
      correct: String(qObj.correct ?? "A"),
      explanation: qObj.explanation ? String(qObj.explanation) : null,
      chapter: qObj.chapter ? String(qObj.chapter) : null,
    };
  });

  const service = createServiceRoleClient();
  const { error: insertError } = await service.from("quiz_questions").insert(rows);

  if (insertError) {
    return NextResponse.json(
      { error: `Failed to save questions: ${insertError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ questions_added: rows.length });
}
