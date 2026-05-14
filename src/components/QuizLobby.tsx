"use client";

import { useState, useEffect } from "react";
import { Shuffle, ListOrdered, BookOpen } from "lucide-react";
import type { QuizQuestion } from "@/lib/types";
import { getProgress, clearProgress } from "@/lib/quizStorage";
import QuizTaker from "./QuizTaker";

interface Props {
  bankId: string;
  questions: QuizQuestion[];
}

function shuffleAndPick(arr: QuizQuestion[], n: number): QuizQuestion[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function QuizLobby({ bankId, questions }: Props) {
  const [mode, setMode] = useState<"lobby" | "full" | "random">("lobby");
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [resumable, setResumable] = useState<{ index: number; score: number; mode: "full" | "random"; questionIds: string[] } | null>(null);

  useEffect(() => {
    const saved = getProgress(bankId);
    if (saved && saved.index > 0) setResumable(saved);
  }, [bankId]);

  function startFull() {
    clearProgress(bankId);
    setActiveQuestions(questions);
    setMode("full");
  }

  function startRandom() {
    clearProgress(bankId);
    const picked = shuffleAndPick(questions, Math.min(20, questions.length));
    setActiveQuestions(picked);
    setMode("random");
  }

  function resume() {
    if (!resumable) return;
    const ordered = resumable.mode === "full"
      ? questions
      : resumable.questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as QuizQuestion[];
    setActiveQuestions(ordered);
    setMode(resumable.mode);
  }

  function dismissResume() {
    clearProgress(bankId);
    setResumable(null);
  }

  if (mode !== "lobby") {
    return (
      <QuizTaker
        questions={activeQuestions}
        bankId={bankId}
        mode={mode}
        resumeFrom={resumable && mode === resumable.mode ? resumable.index : 0}
        resumeScore={resumable && mode === resumable.mode ? resumable.score : 0}
        onExit={() => { setMode("lobby"); setResumable(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Resume banner */}
      {resumable && (
        <div className="p-4 rounded-xl border border-amber-700/50 bg-amber-950/20 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-300">Resume in progress</p>
            <p className="text-xs text-ink-400 mt-0.5">
              {resumable.mode === "full" ? "Full quiz" : "Random 20"} · Q{resumable.index + 1} · {resumable.score} correct
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={resume} className="px-3 py-1.5 rounded-md bg-amber-600 text-white text-xs font-medium hover:bg-amber-500 transition-colors">
              Resume
            </button>
            <button onClick={dismissResume} className="px-3 py-1.5 rounded-md border border-ink-700 text-ink-400 text-xs hover:bg-ink-800 transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Start buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={startFull}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border border-ink-700 bg-ink-900/40 hover:bg-ink-800/60 hover:border-ink-600 transition-colors group"
        >
          <ListOrdered size={22} className="text-accent group-hover:scale-110 transition-transform" />
          <span className="font-medium text-ink-50 text-sm">Full quiz</span>
          <span className="text-xs text-ink-500">{questions.length} questions</span>
        </button>
        <button
          onClick={startRandom}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border border-ink-700 bg-ink-900/40 hover:bg-ink-800/60 hover:border-ink-600 transition-colors group"
        >
          <Shuffle size={22} className="text-accent group-hover:scale-110 transition-transform" />
          <span className="font-medium text-ink-50 text-sm">
            Random {Math.min(20, questions.length)}
          </span>
          <span className="text-xs text-ink-500">shuffled each time</span>
        </button>
      </div>

      {/* Question list */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-ink-400 mb-3 flex items-center gap-2">
          <BookOpen size={13} />
          Questions ({questions.length})
        </h3>
        <div className="space-y-1 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-ink-900/40 border border-ink-800 hover:border-ink-700 transition-colors"
            >
              <span className="text-xs text-ink-500 tabular-nums mt-0.5 shrink-0 w-6 text-right">{i + 1}</span>
              <div className="min-w-0 flex-1">
                {q.chapter && (
                  <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-ink-800 text-ink-400 mb-1">
                    {q.chapter}
                  </span>
                )}
                <p className="text-xs text-ink-300 line-clamp-2 leading-relaxed">{q.question}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
