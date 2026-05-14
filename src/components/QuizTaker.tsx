"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuizQuestion } from "@/lib/types";
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, ChevronLeft } from "lucide-react";

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export default function QuizTaker({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[index];
  const isCorrect = selected === q?.correct;
  const isLast = index === questions.length - 1;

  function handleCheck() {
    if (!selected) return;
    setChecked(true);
    if (selected === q.correct) setScore((s) => s + 1);
  }

  function handleNext() {
    if (isLast) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setChecked(false);
    }
  }

  function handleRestart() {
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setScore(0);
    setDone(false);
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <div className="text-5xl font-bold text-ink-50">{pct}%</div>
        <div className="text-ink-300 text-sm">
          {score} / {questions.length} correct
        </div>
        <button
          onClick={handleRestart}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-ink-950 font-medium text-sm hover:bg-accent-muted hover:text-white transition-colors"
        >
          <RotateCcw size={15} />
          Try again
        </button>
        <Link
          href="/quiz-banks"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-ink-700 text-ink-300 font-medium text-sm hover:bg-ink-800 transition-colors"
        >
          <ChevronLeft size={15} />
          All quizzes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>
          Question {index + 1} / {questions.length}
        </span>
        {q.chapter && <span className="text-ink-500">{q.chapter}</span>}
        <span>{score} correct</span>
      </div>

      <div className="w-full bg-ink-800 rounded-full h-1">
        <div
          className="bg-accent h-1 rounded-full transition-all"
          style={{ width: `${((index) / questions.length) * 100}%` }}
        />
      </div>

      <div className="p-5 rounded-xl border border-ink-700 bg-ink-900/70">
        <p className="text-ink-50 font-medium leading-relaxed">{q.question}</p>
      </div>

      <div className="space-y-2">
        {OPTION_KEYS.map((key) => {
          const text = q.options[key];
          if (!text) return null;

          let style = "border-ink-700 bg-ink-900/40 text-ink-200 hover:border-ink-500 hover:bg-ink-800";
          if (selected === key && !checked) style = "border-accent bg-accent/10 text-ink-50";
          if (checked && key === q.correct) style = "border-emerald-500 bg-emerald-500/10 text-emerald-200";
          if (checked && selected === key && key !== q.correct) style = "border-rose-500 bg-rose-500/10 text-rose-200";

          return (
            <button
              key={key}
              disabled={checked}
              onClick={() => setSelected(key)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${style} disabled:cursor-default`}
            >
              <span className="font-medium mr-2">{key}.</span>
              {text}
            </button>
          );
        })}
      </div>

      {checked && (
        <div
          className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${
            isCorrect
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-200"
          }`}
        >
          {isCorrect ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
          <div>
            <span className="font-medium">{isCorrect ? "Correct!" : `Wrong — answer is ${q.correct}.`}</span>
            {q.explanation && <p className="mt-1 text-xs opacity-80">{q.explanation}</p>}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        {!checked ? (
          <button
            disabled={!selected}
            onClick={handleCheck}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-ink-950 font-medium text-sm hover:bg-accent-muted hover:text-white transition-colors disabled:opacity-40"
          >
            Check
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-ink-950 font-medium text-sm hover:bg-accent-muted hover:text-white transition-colors"
          >
            {isLast ? "Finish" : "Next"}
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
