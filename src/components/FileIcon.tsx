import { FileText, FileType2, Presentation, FileCode2 } from "lucide-react";
import type { FileType } from "@/lib/types";

const ICONS: Record<FileType, typeof FileText> = {
  pdf: FileText,
  docx: FileType2,
  pptx: Presentation,
  md: FileCode2,
};

const COLORS: Record<FileType, string> = {
  pdf: "text-rose-300 bg-rose-300/10 ring-rose-300/20",
  docx: "text-sky-300 bg-sky-300/10 ring-sky-300/20",
  pptx: "text-amber-300 bg-amber-300/10 ring-amber-300/20",
  md: "text-emerald-300 bg-emerald-300/10 ring-emerald-300/20",
};

export function FileIcon({
  type,
  size = "md",
}: {
  type: FileType;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = ICONS[type];
  const dim =
    size === "sm" ? "w-7 h-7" : size === "lg" ? "w-12 h-12" : "w-9 h-9";
  const iconDim = size === "sm" ? 14 : size === "lg" ? 22 : 18;

  return (
    <div
      className={`${dim} rounded-md grid place-items-center ring-1 ${COLORS[type]}`}
      aria-hidden="true"
    >
      <Icon size={iconDim} strokeWidth={1.75} />
    </div>
  );
}

export function FileTypeBadge({ type }: { type: FileType }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider ring-1 ${COLORS[type]}`}
    >
      {type}
    </span>
  );
}
