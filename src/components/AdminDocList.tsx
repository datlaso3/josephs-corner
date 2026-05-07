"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, ExternalLink, Loader2 } from "lucide-react";
import type { DocumentRow } from "@/lib/types";
import { formatBytes } from "@/lib/types";
import { FileTypeBadge } from "./FileIcon";

export default function AdminDocList({ docs }: { docs: DocumentRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(doc: DocumentRow) {
    if (
      !confirm(
        `Delete "${doc.title}"? This removes the file from storage and the database.`,
      )
    ) {
      return;
    }
    setError(null);
    setPendingId(doc.id);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Delete failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setPendingId(null);
    }
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-ink-700 rounded-xl bg-ink-900/40 text-ink-300 text-sm">
        No documents uploaded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="text-sm text-rose-300 bg-rose-300/10 ring-1 ring-rose-300/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <div className="rounded-xl border border-ink-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-800/70 text-ink-300 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Title</th>
              <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">
                Category
              </th>
              <th className="text-left font-medium px-4 py-2.5 hidden sm:table-cell">
                Type
              </th>
              <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">
                Size
              </th>
              <th className="text-right font-medium px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {docs.map((d) => (
              <tr key={d.id} className="hover:bg-ink-900/60">
                <td className="px-4 py-3 align-middle">
                  <div className="font-medium text-ink-50 line-clamp-1">
                    {d.title}
                  </div>
                  {d.description && (
                    <div className="text-xs text-ink-300 line-clamp-1">
                      {d.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-middle hidden md:table-cell text-ink-200">
                  {d.category ?? "—"}
                </td>
                <td className="px-4 py-3 align-middle hidden sm:table-cell">
                  <FileTypeBadge type={d.file_type} />
                </td>
                <td className="px-4 py-3 align-middle hidden lg:table-cell text-ink-300">
                  {formatBytes(d.file_size)}
                </td>
                <td className="px-4 py-3 align-middle text-right">
                  <div className="inline-flex items-center gap-1">
                    <Link
                      href={`/doc/${d.id}`}
                      target="_blank"
                      className="p-1.5 rounded text-ink-300 hover:text-white hover:bg-ink-700"
                      aria-label="View"
                    >
                      <ExternalLink size={15} />
                    </Link>
                    <button
                      onClick={() => onDelete(d)}
                      disabled={pendingId === d.id}
                      className="p-1.5 rounded text-ink-300 hover:text-rose-300 hover:bg-ink-700 disabled:opacity-50"
                      aria-label="Delete"
                    >
                      {pendingId === d.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
