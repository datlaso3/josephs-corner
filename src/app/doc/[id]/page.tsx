import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FileTypeBadge } from "@/components/FileIcon";
import { formatBytes } from "@/lib/types";
import type { DocumentRow } from "@/lib/types";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import QuizPanel from "@/components/QuizPanel";

const STORAGE_BUCKET = "documents";

export const revalidate = 0;

async function getDoc(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load document:", error.message);
    return null;
  }
  return (data ?? null) as DocumentRow | null;
}

function getPublicUrl(filePath: string) {
  const supabase = createClient();
  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return publicUrl;
}

async function fetchMarkdown(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function DocPage({ params }: { params: { id: string } }) {
  const doc = await getDoc(params.id);
  if (!doc) notFound();

  const url = getPublicUrl(doc.file_path);
  const markdown = doc.file_type === "md" ? await fetchMarkdown(url) : null;

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-ink-300 hover:text-white mb-6"
      >
        <ChevronLeft size={16} />
        Back to library
      </Link>

      <header className="mb-6">
        <div className="flex items-start gap-3 flex-wrap">
          <FileTypeBadge type={doc.file_type} />
          {doc.category && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-ink-700/70 text-ink-200">
              {doc.category}
            </span>
          )}
          <span className="text-xs text-ink-300">
            {formatDate(doc.created_at)} · {formatBytes(doc.file_size)}
          </span>
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-ink-50 leading-tight">
          {doc.title}
        </h1>
        {doc.description && (
          <p className="mt-2 text-ink-200 max-w-3xl">{doc.description}</p>
        )}
        {doc.tags && doc.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {doc.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-1.5 py-0.5 rounded bg-ink-700/70 text-ink-200"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <a
            href={url}
            download
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-accent text-ink-950 font-medium text-sm hover:bg-accent-muted hover:text-white transition-colors"
          >
            <Download size={15} />
            Download
          </a>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-ink-600 text-sm text-ink-100 hover:border-ink-500 hover:text-white transition-colors"
          >
            Open in new tab
          </a>
        </div>
      </header>

      <QuizPanel documentId={doc.id} fileType={doc.file_type} />

      <section className="mt-8">
        {doc.file_type === "md" ? (
          markdown !== null ? (
            <article className="rounded-xl border border-ink-700 bg-ink-900/70 p-6 sm:p-8">
              <MarkdownPreview source={markdown} />
            </article>
          ) : (
            <NoPreview note="Couldn't load the markdown source. Use Download to grab the file." />
          )
        ) : doc.file_type === "pdf" || doc.file_type === "pptx" || doc.file_type === "docx" ? (
          <GoogleDocsViewer url={url} title={doc.title} />
        ) : (
          <NoPreview
            note={`Inline preview isn't available for ${(doc.file_type as string).toUpperCase()} files. Use the Download button above to view in your local app.`}
          />
        )}
      </section>
    </div>
  );
}

function GoogleDocsViewer({ url, title }: { url: string; title: string }) {
  const src = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  return (
    <div className="rounded-xl overflow-hidden border border-ink-700 bg-ink-800 h-[80vh]">
      <iframe src={src} title={title} className="w-full h-full" />
    </div>
  );
}

function NoPreview({ note }: { note: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-700 bg-ink-900/40 p-10 text-center">
      <p className="text-ink-200">{note}</p>
    </div>
  );
}
