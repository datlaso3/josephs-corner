"use client";

import { useState, useEffect } from "react";
import { Brain, Copy, Check } from "lucide-react";

interface MCQ {
  id: number;
  tier: string;
  question: string;
  options: Record<string, string>;
  correct: string;
  why: string;
}

interface QuizData {
  source_summary: string;
  insufficient_content: boolean;
  questions: MCQ[];
}

const STEPPER_STATES = [
  "Indexing source...",
  "Identifying gaps...",
  "Synthesizing batch...",
];

export default function QuizPanel({
  documentId,
  fileType,
}: {
  documentId: string;
  fileType: string;
}) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [stepperIndex, setStepperIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const unsupported = fileType === "pdf";

  // Cycle stepper text while loading
  useEffect(() => {
    if (!loading) return;
    setStepperIndex(0);
    const interval = setInterval(() => {
      setStepperIndex((i) => (i + 1) % STEPPER_STATES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  async function generate() {
    setLoading(true);
    setError(null);
    setQuiz(null);
    setAnswers({});
    setRevealed({});
    try {
      const startRes = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error ?? "Failed to start quiz");

      const { jobId } = startData;

      while (true) {
        await new Promise((r) => setTimeout(r, 2000));
        const statusRes = await fetch(`/api/quiz/status/${jobId}`);
        const statusData = await statusRes.json();
        if (!statusRes.ok) throw new Error(statusData.error ?? "Failed to check status");
        if (statusData.status === "done") { setQuiz(statusData.result); break; }
        if (statusData.status === "error") throw new Error(statusData.error ?? "Quiz generation failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  }

  function copyAsText() {
    if (!quiz) return;
    const lines: string[] = [];
    if (quiz.source_summary) lines.push(`Summary: ${quiz.source_summary}`, "");
    quiz.questions.forEach((q, i) => {
      lines.push(`Q${i + 1}. ${q.question}`);
      Object.entries(q.options).forEach(([k, v]) => lines.push(`  ${k}) ${v}`));
      lines.push(`Answer: ${q.correct}`);
      lines.push(`Why: ${q.why}`);
      lines.push("");
    });
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (unsupported) {
    return (
      <p className="text-xs text-ink-400 mt-2">
        Quiz generation not available for PDF. Upload PPTX, DOCX, or MD.
      </p>
    );
  }

  return (
    <div className="mt-6 border-t border-ink-700 pt-6">
      {/* Stepper */}
      <p className="text-xs text-ink-400 mb-3 h-4">
        {loading ? STEPPER_STATES[stepperIndex] : ""}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-ink-700 border border-ink-600 text-sm text-ink-100 hover:bg-ink-600 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Brain size={15} />
          {loading ? "Working…" : quiz ? "Generate New Quiz" : "Generate Quiz"}
        </button>

        {quiz && (
          <button
            onClick={copyAsText}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md border border-ink-600 text-sm text-ink-300 hover:text-white hover:border-ink-500 transition-colors"
          >
            {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy as Text"}
          </button>
        )}

        {quiz && (
          <span className="text-xs text-ink-400">
            {quiz.questions.length} questions · Llama 3.3 70B · Groq
          </span>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {quiz && (
        <div className="mt-6 space-y-4">
          {quiz.source_summary && (
            <p className="text-sm text-ink-300 italic">{quiz.source_summary}</p>
          )}

          {quiz.questions.map((q, i) => (
            <MCQCard
              key={q.id}
              index={i}
              q={q}
              selected={answers[q.id]}
              onSelect={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
              revealed={!!revealed[q.id]}
              onReveal={() =>
                setRevealed((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MCQCard({
  index,
  q,
  selected,
  onSelect,
  revealed,
  onReveal,
}: {
  index: number;
  q: MCQ;
  selected: string | undefined;
  onSelect: (v: string) => void;
  revealed: boolean;
  onReveal: () => void;
}) {
  const isCorrect = selected === q.correct;
  const tierColor =
    q.tier === "foundational"
      ? "bg-blue-900/30 text-blue-300"
      : "bg-purple-900/30 text-purple-300";

  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-ink-400 font-mono">Q{index + 1}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide font-medium ${tierColor}`}>
          {q.tier}
        </span>
      </div>

      <p className="text-sm font-medium text-ink-50 mb-3">{q.question}</p>

      <div className="space-y-2">
        {Object.entries(q.options).map(([key, val]) => {
          const isSelected = selected === key;
          const isCorrectOpt = key === q.correct;

          let cls = "border-ink-600 text-ink-200 hover:border-ink-500 hover:text-white cursor-pointer";
          if (revealed && isCorrectOpt) cls = "border-green-600 bg-green-900/20 text-green-300 cursor-default";
          else if (revealed && isSelected) cls = "border-red-600 bg-red-900/20 text-red-300 cursor-default";
          else if (isSelected) cls = "border-accent text-accent bg-accent/10 cursor-pointer";

          return (
            <button
              key={key}
              onClick={() => !revealed && onSelect(key)}
              disabled={revealed}
              aria-label={`Option ${key}: ${val}`}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${cls}`}
            >
              <span className="font-mono mr-2 opacity-50">{key}.</span>
              {val}
            </button>
          );
        })}
      </div>

      {selected && !revealed && (
        <button
          onClick={onReveal}
          className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md border border-ink-600 text-xs text-ink-300 hover:text-white hover:border-ink-500 transition-colors"
        >
          Check answer
        </button>
      )}

      {revealed && (
        <div className={`mt-3 text-xs p-3 rounded-lg ${isCorrect ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300"}`}>
          {isCorrect ? "Correct. " : `Wrong — answer is ${q.correct}. `}
          <span className="text-ink-300">{q.why}</span>
        </div>
      )}
    </div>
  );
}
