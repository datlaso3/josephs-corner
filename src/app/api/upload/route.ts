import { NextResponse } from "next/server";
import { getAdminUser, createServiceRoleClient } from "@/lib/supabase/server";
import { fileTypeFromName } from "@/lib/types";

const STORAGE_BUCKET = "documents";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — keep in sync with UploadForm

export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1. Authn/authz — only the configured admin email can upload.
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse form data.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  const title = (form.get("title") ?? "").toString().trim();
  const description = (form.get("description") ?? "").toString().trim();
  const category = (form.get("category") ?? "").toString().trim();
  const tagsRaw = (form.get("tags") ?? "").toString().trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Max ${MAX_BYTES} bytes.` },
      { status: 400 },
    );
  }

  const fileType = fileTypeFromName(file.name);
  if (!fileType) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: PDF, DOCX, PPTX, MD." },
      { status: 400 },
    );
  }

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // 3. Compose a safe storage path: <yyyy>/<mm>/<random>-<safe-filename>
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 10);
  const safeName = file.name
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
  const storagePath = `${yyyy}/${mm}/${rand}-${safeName}`;

  // 4. Upload to Supabase Storage using the service role key.
  const service = createServiceRoleClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType =
    file.type && file.type !== "application/octet-stream"
      ? file.type
      : fileType === "pdf"
        ? "application/pdf"
        : fileType === "md"
          ? "text/markdown"
          : "application/octet-stream";

  const { error: uploadError } = await service.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  // 5. Insert metadata row.
  const { data: inserted, error: insertError } = await service
    .from("documents")
    .insert({
      title,
      description: description || null,
      category: category || null,
      tags: tags.length ? tags : null,
      file_path: storagePath,
      file_type: fileType,
      file_size: file.size,
    })
    .select("id")
    .single();

  if (insertError) {
    // Rollback storage on DB failure.
    await service.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: `Database error: ${insertError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id });
}
