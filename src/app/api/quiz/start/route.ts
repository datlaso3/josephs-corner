import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { processQuiz } from "@/lib/quiz-processor";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const { data: job, error } = await service
    .from("quiz_jobs")
    .insert({ document_id: documentId, status: "pending" })
    .select("id")
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  await processQuiz(job.id, documentId);

  return NextResponse.json({ jobId: job.id });
}
