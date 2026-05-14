"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Upload, Loader2, CheckCircle2, AlertCircle, RotateCcw, ExternalLink } from "lucide-react";
import { formatBytes } from "@/lib/types";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 30000];
const STORAGE_KEY = "quiz_bank_import_pending";

type Phase = "idle" | "uploading" | "processing" | "paused" | "done";

interface SavedProgress {
  bankId: string;
  bankTitle: string;
  chunks: string[];
  currentChunk: number;
  totalChunks: number;
  questionsImported: number;
}

interface Progress extends SavedProgress {
  retryCount: number;
  statusLine: string;
}

function loadSavedProgress(): SavedProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePendingProgress(p: SavedProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}

function clearPendingProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export default function QuizBankUploadForm() {
  const formRef = useRef<HTMLFormElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [resumable, setResumable] = useState<SavedProgress | null>(null);

  useEffect(() => {
    const saved = loadSavedProgress();
    if (saved) setResumable(saved);
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function processChunks(bankId: string, bankTitle: string, chunks: string[], startChunk = 0, startImported = 0) {
    let sortOrderOffset = startImported;
    let totalImported = startImported;

    for (let i = startChunk; i < chunks.length; i++) {
      let success = false;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        setProgress((p) => p && ({
          ...p,
          currentChunk: i,
          retryCount: attempt,
          statusLine: attempt === 0
            ? `Processing chunk ${i + 1} of ${chunks.length}…`
            : `Retrying chunk ${i + 1} (attempt ${attempt + 1} of ${MAX_RETRIES})…`,
        }));

        if (attempt > 0) await sleep(RETRY_DELAYS[attempt - 1]);

        try {
          const res = await fetch("/api/quiz-bank/import/chunk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bank_id: bankId,
              chunk_text: chunks[i],
              chunk_index: i,
              sort_order_offset: sortOrderOffset,
            }),
          });

          const json = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(json?.error ?? "Chunk failed");

          const added: number = json.questions_added ?? 0;
          sortOrderOffset += added;
          totalImported += added;

          setProgress((p) => p && ({ ...p, questionsImported: totalImported, retryCount: 0 }));

          // Persist after every successful chunk
          savePendingProgress({
            bankId,
            bankTitle,
            chunks,
            currentChunk: i + 1,
            totalChunks: chunks.length,
            questionsImported: totalImported,
          });

          success = true;
          break;
        } catch (err) {
          if (attempt === MAX_RETRIES - 1) {
            setPhase("paused");
            setProgress((p) => p && ({
              ...p,
              currentChunk: i,
              statusLine: `Stuck on chunk ${i + 1} — ${err instanceof Error ? err.message : "unknown error"}`,
            }));
            return;
          }
        }
      }

      if (!success) return;

      if (i < chunks.length - 1) {
        setProgress((p) => p && ({
          ...p,
          statusLine: `Chunk ${i + 1} done — preparing next…`,
        }));
        await sleep(8000);
      }
    }

    clearPendingProgress();
    setResumable(null);
    setPhase("done");
    setProgress((p) => p && ({ ...p, currentChunk: chunks.length, statusLine: "Import complete" }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) { setError("Pick a DOCX file."); return; }
    if (!file.name.toLowerCase().endsWith(".docx")) { setError("Only DOCX files supported."); return; }
    if (file.size > MAX_BYTES) { setError(`File too large. Max ${formatBytes(MAX_BYTES)}.`); return; }
    if (!title.trim()) { setError("Title is required."); return; }

    setPhase("uploading");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    fd.append("description", description.trim());

    let bankId: string, chunks: string[], totalChunks: number;

    try {
      const res = await fetch("/api/quiz-bank/import/prepare", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Prepare failed.");
      bankId = json.bank_id;
      chunks = json.chunks;
      totalChunks = json.total_chunks;
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Upload failed.");
      return;
    }

    const bankTitle = title.trim();
    setPhase("processing");
    setProgress({
      bankId, bankTitle, chunks,
      currentChunk: 0, totalChunks,
      questionsImported: 0, retryCount: 0,
      statusLine: `Starting — ${totalChunks} chunk${totalChunks !== 1 ? "s" : ""} to process…`,
    });

    // Persist immediately so resume works if tab closes after prepare
    savePendingProgress({ bankId, bankTitle, chunks, currentChunk: 0, totalChunks, questionsImported: 0 });

    await processChunks(bankId, bankTitle, chunks, 0, 0);
  }

  async function onRetry() {
    if (!progress) return;
    setPhase("processing");
    await processChunks(progress.bankId, progress.bankTitle, progress.chunks, progress.currentChunk, progress.questionsImported);
  }

  async function onResume(saved: SavedProgress) {
    setResumable(null);
    setPhase("processing");
    setProgress({
      ...saved,
      retryCount: 0,
      statusLine: `Resuming from chunk ${saved.currentChunk + 1} of ${saved.totalChunks}…`,
    });
    await processChunks(saved.bankId, saved.bankTitle, saved.chunks, saved.currentChunk, saved.questionsImported);
  }

  function onDismissResume() {
    clearPendingProgress();
    setResumable(null);
  }

  function onReset() {
    setPhase("idle");
    setProgress(null);
    setError(null);
    setFile(null);
    setTitle("");
    setDescription("");
    formRef.current?.reset();
  }

  const pct = progress
    ? Math.round((progress.currentChunk / progress.totalChunks) * 100)
    : 0;

  // ── Done ────────────────────────────────────────────────────────────────────
  if (phase === "done" && progress) {
    return (
      <div className="space-y-3 p-5 rounded-xl border border-emerald-700/50 bg-emerald-950/30 shadow-card">
        <div className="flex items-center gap-2 text-emerald-300">
          <CheckCircle2 size={18} />
          <span className="font-medium">Import complete</span>
        </div>
        <p className="text-sm text-ink-300">
          <span className="text-emerald-300 font-semibold">{progress.questionsImported}</span> questions
          imported into <span className="text-ink-100 font-medium">{progress.bankTitle}</span>.
        </p>
        <div className="flex gap-2 pt-1">
          <Link
            href={`/quiz-banks/${progress.bankId}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-accent text-ink-950 font-medium text-sm hover:bg-accent-muted hover:text-white transition-colors"
          >
            <ExternalLink size={14} />
            Open Quiz
          </Link>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-ink-700 text-ink-300 font-medium text-sm hover:bg-ink-800 transition-colors"
          >
            <RotateCcw size={14} />
            Import another
          </button>
        </div>
      </div>
    );
  }

  // ── Paused ──────────────────────────────────────────────────────────────────
  if (phase === "paused" && progress) {
    return (
      <div className="space-y-3 p-5 rounded-xl border border-amber-700/50 bg-amber-950/20 shadow-card">
        <div className="flex items-center gap-2 text-amber-300">
          <AlertCircle size={18} />
          <span className="font-medium">Import paused</span>
        </div>
        <p className="text-sm text-ink-300">{progress.statusLine}</p>
        <p className="text-xs text-ink-500">
          {progress.questionsImported} questions saved · chunk {progress.currentChunk + 1} of {progress.totalChunks}
        </p>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-amber-600 text-white font-medium text-sm hover:bg-amber-500 transition-colors"
          >
            <RotateCcw size={14} />
            Retry
          </button>
          <Link
            href={`/quiz-banks/${progress.bankId}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-ink-700 text-ink-300 font-medium text-sm hover:bg-ink-800 transition-colors"
          >
            <ExternalLink size={14} />
            Accept partial ({progress.questionsImported}q)
          </Link>
        </div>
      </div>
    );
  }

  // ── Processing ──────────────────────────────────────────────────────────────
  if ((phase === "processing" || phase === "uploading") && progress) {
    return (
      <div className="space-y-4 p-5 rounded-xl border border-ink-700 bg-ink-900/70 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-ink-50">Importing quiz bank</h2>
          <span className="text-xs text-ink-400 tabular-nums">{pct}%</span>
        </div>

        <div className="w-full bg-ink-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-accent h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-ink-300">
            <Loader2 size={13} className="animate-spin shrink-0" />
            <span>{progress.statusLine}</span>
          </div>
          {progress.retryCount > 0 && (
            <p className="text-xs text-amber-400 pl-5">
              Attempt {progress.retryCount + 1} of {MAX_RETRIES}…
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-ink-500 border-t border-ink-800 pt-3">
          <span>Chunk {Math.min(progress.currentChunk + 1, progress.totalChunks)} / {progress.totalChunks}</span>
          <span className="text-ink-300 font-medium tabular-nums">
            {progress.questionsImported} questions imported
          </span>
        </div>
      </div>
    );
  }

  if (phase === "uploading") {
    return (
      <div className="space-y-3 p-5 rounded-xl border border-ink-700 bg-ink-900/70 shadow-card">
        <h2 className="font-medium text-ink-50">Import quiz bank</h2>
        <div className="flex items-center gap-2 text-sm text-ink-400">
          <Loader2 size={13} className="animate-spin" />
          Uploading and extracting text…
        </div>
      </div>
    );
  }

  // ── Idle form ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Resume banner */}
      {resumable && (
        <div className="p-4 rounded-xl border border-amber-700/50 bg-amber-950/20 space-y-2">
          <div className="flex items-center gap-2 text-amber-300 text-sm font-medium">
            <AlertCircle size={14} />
            Unfinished import detected
          </div>
          <p className="text-xs text-ink-400">
            <span className="text-ink-200">{resumable.bankTitle}</span> — {resumable.questionsImported} questions saved,
            chunk {resumable.currentChunk} of {resumable.totalChunks} complete.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onResume(resumable)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-medium hover:bg-amber-500 transition-colors"
            >
              <RotateCcw size={12} />
              Resume
            </button>
            <button
              onClick={onDismissResume}
              className="px-3 py-1.5 rounded-md border border-ink-700 text-ink-400 text-xs hover:bg-ink-800 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="space-y-3 p-5 rounded-xl border border-ink-700 bg-ink-900/70 shadow-card"
      >
        <h2 className="font-medium text-ink-50">Import quiz bank</h2>

        <label className="block">
          <span className="text-xs text-ink-300">File (DOCX)</span>
          <input
            type="file"
            accept=".docx"
            onChange={onFileChange}
            className="mt-1 block w-full text-sm text-ink-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-ink-700 file:text-ink-100 hover:file:bg-ink-600 file:cursor-pointer cursor-pointer"
          />
          {file && (
            <span className="text-xs text-ink-300 mt-1 inline-block">
              {file.name} · {formatBytes(file.size)}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-xs text-ink-300">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-base mt-1"
            placeholder="Chapter 1–4 MCQ"
            required
          />
        </label>

        <label className="block">
          <span className="text-xs text-ink-300">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input-base mt-1"
            placeholder="Optional. Shown on the quiz banks page."
          />
        </label>

        {error && (
          <div className="text-sm text-rose-300 bg-rose-300/10 ring-1 ring-rose-300/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md bg-accent text-ink-950 font-medium text-sm hover:bg-accent-muted hover:text-white transition-colors"
        >
          <Upload size={15} />
          Import
        </button>
      </form>
    </div>
  );
}
