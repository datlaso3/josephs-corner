import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a university-level course instructor and expert assessment designer. Generate a rigorous 10-question MCQ quiz STRICTLY from the provided source text. Do not use outside knowledge or hallucinate facts.

STEP 1 — Before writing questions, internally identify the 10 most important testable concepts spread across the FULL document, not just the beginning.

STEP 2 — Generate exactly 10 MCQs using this Bloom's taxonomy distribution:
- 2 Remember: key definitions, terms, facts a student must memorize
- 4 Understand/Apply: explain a concept, apply it to a scenario, trace cause-effect
- 4 Analyze/Evaluate: compare, infer, critique, or reason from evidence in the text

QUESTION RULES:
- Never write a question answerable by copying a single sentence from the source verbatim — questions must require understanding
- The question stem must be complete and clear without reading the options
- All 4 options must be similar in length and grammatical form

DISTRACTOR RULES (wrong answer options):
- For each wrong option, think: "what misconception or common mistake would a student make here?"
- Base distractors on realistic student errors — not random wrong facts
- Distractors must be in the same domain and sound plausible to someone who studied but misunderstood

Every question must include a "why" field: 1 sentence explaining why the correct answer is right and what makes the distractors wrong.

If source text is too short for 10 questions, reduce count and set "insufficient_content": true.

Respond with ONLY valid JSON. No prose, no markdown fences, nothing outside the JSON:

{
  "source_summary": "string",
  "insufficient_content": false,
  "questions": [
    {
      "id": 1,
      "tier": "remember|understand|apply|analyze",
      "question": "string",
      "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
      "correct": "A",
      "why": "string"
    }
  ]
}`;

function extractTextFromPptx(buffer: Buffer): string {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => a.entryName.localeCompare(b.entryName));

  return slideEntries
    .map((entry) => {
      const xml = entry.getData().toString("utf8");
      const matches = [...xml.matchAll(/<a:t[^>]*>([^<]+)<\/a:t>/g)];
      return matches.map((m) => m[1]).join(" ");
    })
    .filter((s) => s.trim())
    .join("\n");
}

function extractTextFromDocx(buffer: Buffer): string {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry("word/document.xml");
  if (!entry) return "";
  const xml = entry.getData().toString("utf8");
  const matches = [...xml.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g)];
  return matches.map((m) => m[1]).join(" ");
}

function extractJson(raw: string): string {
  // Strip markdown fences
  let cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  // Extract first {...} block if model added prose
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

export async function POST(request: Request) {
  let body: { documentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { documentId } = body;
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  const service = createServiceRoleClient();

  const { data: doc, error: docError } = await service
    .from("documents")
    .select("file_path, file_type, title")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data: fileData, error: downloadError } = await service.storage
    .from("documents")
    .download(doc.file_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());

  let text = "";
  if (doc.file_type === "md") {
    text = buffer.toString("utf8");
  } else if (doc.file_type === "pptx") {
    text = extractTextFromPptx(buffer);
  } else if (doc.file_type === "docx") {
    text = extractTextFromDocx(buffer);
  } else {
    return NextResponse.json(
      { error: "Quiz generation not supported for PDF. Upload PPTX, DOCX, or MD." },
      { status: 400 },
    );
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "Could not extract text from file" }, { status: 422 });
  }

  const truncated = text.slice(0, 12000);

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
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 4000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Generate a quiz from this source text:\n\n${truncated}` },
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

  let quiz: unknown;
  try {
    quiz = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 500 });
  }

  return NextResponse.json(quiz);
}
