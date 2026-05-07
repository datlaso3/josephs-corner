"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";
import { fileTypeFromName, formatBytes } from "@/lib/types";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export default function UploadForm({
  knownCategories,
}: {
  knownCategories: string[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    if (f && !title) {
      // Default title to filename without extension
      const base = f.name.replace(/\.[^.]+$/, "");
      setTitle(base);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Pick a file to upload.");
      return;
    }
    if (!fileTypeFromName(file.name)) {
      setError("Only PDF, DOCX, PPTX, and Markdown (.md) are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`File too large. Max ${formatBytes(MAX_BYTES)}.`);
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    fd.append("description", description.trim());
    fd.append("category", category.trim());
    fd.append("tags", tagsRaw.trim());

    setSubmitting(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? "Upload failed.");
      }
      setSuccess("Uploaded.");
      setFile(null);
      setTitle("");
      setDescription("");
      setCategory("");
      setTagsRaw("");
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="space-y-3 p-5 rounded-xl border border-ink-700 bg-ink-900/70 shadow-card"
    >
      <h2 className="font-medium text-ink-50">Upload a document</h2>

      <label className="block">
        <span className="text-xs text-ink-300">File (PDF, DOCX, PPTX, MD)</span>
        <input
          type="file"
          accept=".pdf,.docx,.pptx,.md,.markdown"
          onChange={onFileChange}
          className="mt-1 block w-full text-sm text-ink-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-ink-700 file:text-ink-100 hover:file:bg-ink-600 file:cursor-pointer cursor-pointer"
        />
        {file && (
          <span className="text-xs text-ink-300 mt-1 inline-block">
            {file.name} · {formatBytes(file.size)}
          </span>
        )}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-ink-300">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-base mt-1"
            placeholder="Linear Algebra — Week 3"
            required
          />
        </label>

        <label className="block">
          <span className="text-xs text-ink-300">Category</span>
          <input
            type="text"
            list="known-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-base mt-1"
            placeholder="Math"
          />
          <datalist id="known-categories">
            {knownCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-ink-300">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="input-base mt-1"
          placeholder="Optional. Short summary shown on cards."
        />
      </label>

      <label className="block">
        <span className="text-xs text-ink-300">Tags (comma-separated)</span>
        <input
          type="text"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          className="input-base mt-1"
          placeholder="vectors, eigenvalues, midterm"
        />
      </label>

      {error && (
        <div className="text-sm text-rose-300 bg-rose-300/10 ring-1 ring-rose-300/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-emerald-300 bg-emerald-300/10 ring-1 ring-emerald-300/20 rounded-md px-3 py-2">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md bg-accent text-ink-950 font-medium text-sm hover:bg-accent-muted hover:text-white transition-colors disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Upload size={15} />
        )}
        {submitting ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
