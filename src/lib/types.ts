export type FileType = "pdf" | "docx" | "pptx" | "md";

export interface DocumentRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  tags: string[] | null;
  file_path: string;
  file_type: FileType;
  file_size: number;
  created_at: string;
}

export interface DocumentWithUrl extends DocumentRow {
  public_url: string;
}

export const ALLOWED_FILE_TYPES: FileType[] = ["pdf", "docx", "pptx", "md"];

export const FILE_TYPE_MIME: Record<FileType, string[]> = {
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  md: ["text/markdown", "text/x-markdown", "text/plain"],
};

export function fileTypeFromName(name: string): FileType | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  if (ext === "pdf" || ext === "docx" || ext === "pptx" || ext === "md") {
    return ext;
  }
  if (ext === "markdown") return "md";
  return null;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
