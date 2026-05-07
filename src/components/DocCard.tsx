import Link from "next/link";
import { FileIcon } from "./FileIcon";
import type { DocumentRow } from "@/lib/types";
import { formatBytes } from "@/lib/types";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function DocCard({ doc }: { doc: DocumentRow }) {
  return (
    <Link
      href={`/doc/${doc.id}`}
      className="group relative flex flex-col gap-3 p-5 rounded-xl border border-ink-700 bg-ink-900/70 hover:bg-ink-800/80 hover:border-ink-500 transition-colors shadow-card"
    >
      <div className="flex items-start gap-3">
        <FileIcon type={doc.file_type} />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-ink-50 leading-snug line-clamp-2 group-hover:text-white">
            {doc.title}
          </h3>
          {doc.category && (
            <div className="mt-1 text-xs text-ink-300">{doc.category}</div>
          )}
        </div>
      </div>

      {doc.description && (
        <p className="text-sm text-ink-200 line-clamp-3">{doc.description}</p>
      )}

      {doc.tags && doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doc.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-[11px] px-1.5 py-0.5 rounded bg-ink-700/70 text-ink-200"
            >
              #{t}
            </span>
          ))}
          {doc.tags.length > 4 && (
            <span className="text-[11px] text-ink-300">
              +{doc.tags.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between text-xs text-ink-300 pt-1">
        <span>{formatDate(doc.created_at)}</span>
        <span>{formatBytes(doc.file_size)}</span>
      </div>
    </Link>
  );
}
