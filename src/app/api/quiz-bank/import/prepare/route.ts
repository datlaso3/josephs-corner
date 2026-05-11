import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { getAdminUser, createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function extractTextFromDocx(buffer: Buffer): string {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry("word/document.xml");
  if (!entry) return "";
  const xml = entry.getData().toString("utf8");
  const matches = [...xml.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g)];
  return matches.map((m) => m[1]).join(" ");
}

function splitIntoChunks(text: string, chunkSize = 5000): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    if (end < text.length) {
      // Try to split at a paragraph/newline boundary
      const boundary = text.lastIndexOf("\n", end);
      if (boundary > start + 1000) end = boundary;
    } else {
      end = text.length;
    }

    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end;
  }

  return chunks;
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  const title = (form.get("title") ?? "").toString().trim();
  const description = (form.get("description") ?? "").toString().trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json(
      { error: "Only DOCX files supported for quiz bank import" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = extractTextFromDocx(buffer);

  if (!text.trim()) {
    return NextResponse.json(
      { error: "Could not extract text from file" },
      { status: 422 },
    );
  }

  const chunks = splitIntoChunks(text, 5000);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "Document appears empty" }, { status: 422 });
  }

  const service = createServiceRoleClient();
  const { data: bank, error: bankError } = await service
    .from("quiz_banks")
    .insert({ title, description: description || null })
    .select("id")
    .single();

  if (bankError || !bank) {
    return NextResponse.json(
      { error: `DB error: ${bankError?.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    bank_id: bank.id,
    chunks,
    total_chunks: chunks.length,
  });
}
