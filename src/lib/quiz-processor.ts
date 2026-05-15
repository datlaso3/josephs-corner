import AdmZip from "adm-zip";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Direct path import avoids Next.js test-file loading issue with pdf-parse
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text ?? "";
}

const SYSTEM_PROMPT = `You are a university-level course instructor and expert assessment designer. Generate a rigorous 10-question MCQ quiz STRICTLY from the provided source text. Do not use outside knowledge or hallucinate facts.

STEP 1 — Before writing questions, internally identify the 10 most important testable concepts spread across the FULL document, not just the beginning.

STEP 2 — Generate exactly 10 MCQs using this Bloom's taxonomy distribution:
- 2 Remember: key definitions, terms, facts a student must memorize
- 4 Understand/Apply: explain a concept, apply it to a scenario, trace cause-effect
- 4 Analyze/Evaluate: compare, infer, critique, or reason from evidence in the text

QUESTION RULES:
- Never write a question answerable by copying a single sentence from the source verbatim — questions must require understanding
- Never repeat key phrases from the question stem inside any answer option — the correct answer must not echo the question's language
- The question stem must be complete and clear without reading the options
- All 4 options must be similar in length and grammatical form

DISTRACTOR RULES (wrong answer options):
- For each wrong option, think: "what misconception or common mistake would a student make here?"
- Base distractors on realistic student errors — not random wrong facts
- Distractors must be in the same domain and sound plausible to someone who studied but misunderstood
- Every claim in every option must be traceable to the source text — do not infer, extrapolate, or add domain knowledge not present in the text

"why" field rules:
- Explain the reasoning behind the correct answer — do not simply restate it
- Name at least one distractor and explain specifically why it is wrong
- Must be grounded in the source text only

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
  let cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

async function markError(service: ReturnType<typeof createServiceRoleClient>, jobId: string, message: string) {
  await service.from("quiz_jobs").update({ status: "error", error: message }).eq("id", jobId);
}

export async function processQuiz(jobId: string, documentId: string): Promise<void> {
  const service = createServiceRoleClient();

  try {
    const { data: doc, error: docError } = await service
      .from("documents")
      .select("file_path, file_type, title")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      await markError(service, jobId, "Document not found");
      return;
    }

    const { data: fileData, error: downloadError } = await service.storage
      .from("documents")
      .download(doc.file_path);

    if (downloadError || !fileData) {
      await markError(service, jobId, "Failed to download file");
      return;
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    let text = "";
    if (doc.file_type === "md") {
      text = buffer.toString("utf8");
    } else if (doc.file_type === "pptx") {
      text = extractTextFromPptx(buffer);
    } else if (doc.file_type === "docx") {
      text = extractTextFromDocx(buffer);
    } else if (doc.file_type === "pdf") {
      text = await extractTextFromPdf(buffer);
    } else {
      await markError(service, jobId, "Unsupported file type.");
      return;
    }

    if (!text.trim()) {
      await markError(service, jobId, "Could not extract text from file");
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      await markError(service, jobId, "GROQ_API_KEY not configured");
      return;
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
          { role: "user", content: `Generate a quiz from this source text:\n\n${text.slice(0, 12000)}` },
        ],
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      await markError(service, jobId, `Groq error: ${err}`);
      return;
    }

    const groqData = await groqRes.json();
    const raw: string = groqData?.choices?.[0]?.message?.content ?? "";
    const cleaned = extractJson(raw);

    let quiz: unknown;
    try {
      quiz = JSON.parse(cleaned);
    } catch {
      await markError(service, jobId, "AI returned invalid JSON");
      return;
    }

    await service.from("quiz_jobs").update({ status: "done", result: quiz }).eq("id", jobId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await markError(service, jobId, message);
  }
}
