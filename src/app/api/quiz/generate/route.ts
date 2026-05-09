import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are an academic assessment engine. Generate quiz questions ONLY from the provided source text. Do not add outside knowledge or hallucinate facts.

Generate exactly 10 Multiple Choice Questions (MCQs).

Question mix:
- 4 Foundational: definitions, recall, key terms
- 6 Applied: scenarios, cause-effect, application, calculations if relevant

MCQ rules:
- 1 correct answer + 3 plausible but incorrect distractors
- Distractors must be in the same domain, not obviously wrong
- Every question must include a "why" field: 1 sentence explanation citing the source text

If source text is too short for 10 questions, reduce count and set "insufficient_content": true.

Respond with ONLY valid JSON, no prose before or after, no markdown fences:

{
  "source_summary": "string",
  "insufficient_content": false,
  "questions": [
    {
      "id": 1,
      "tier": "foundational",
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
