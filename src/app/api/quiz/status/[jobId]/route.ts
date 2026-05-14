import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } },
) {
  const service = createServiceRoleClient();

  const { data: job, error } = await service
    .from("quiz_jobs")
    .select("status, result, error")
    .eq("id", params.jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
