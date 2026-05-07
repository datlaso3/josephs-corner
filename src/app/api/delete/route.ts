import { NextResponse } from "next/server";
import { getAdminUser, createServiceRoleClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "documents";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const service = createServiceRoleClient();

  const { data: doc, error: fetchError } = await service
    .from("documents")
    .select("id, file_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: `Lookup failed: ${fetchError.message}` },
      { status: 500 },
    );
  }
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete storage object first; ignore "not found" errors but bail on real ones.
  const { error: storageError } = await service.storage
    .from(STORAGE_BUCKET)
    .remove([doc.file_path]);
  if (storageError) {
    console.error("Storage delete error:", storageError.message);
    // Continue — better to remove the DB row than leave a dangling pointer.
  }

  const { error: dbError } = await service
    .from("documents")
    .delete()
    .eq("id", id);
  if (dbError) {
    return NextResponse.json(
      { error: `Delete failed: ${dbError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
