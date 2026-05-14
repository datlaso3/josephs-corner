"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { QuizQuestion } from "@/lib/types";
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, ChevronLeft, Flame, Loader2 } from "lucide-react";
import {
  saveProgress,
  clearProgress,
  getBestStreak,
  updateBestStreak,
  getWrongIds,
  saveWrongIds,
} from "@/lib/quizStorage";

interface Props {
  questions: QuizQuestion[];
  bankId: string;
  mode: "full" | "random";
  resumeFrom?: number;
  resumeScore?: number;
  onExit?: () => void;
}

function getFireStyle(streak: number): { show: boolean; color: string; size: number; pulse: boolean; glow: boolean } {
  if (streak < 3)  return { show: false, color: "", size: 0, pulse: false, glow: false };
  if (streak < 5)  return { show: true, color: "text-amber-400", size: 18, pulse: false, glow: false };
  if (streak < 8)  return { show: true, color: "text-orange-400", size: 20, pulse: true, glow: false };
  if (streak < 10) return { show: true, color: "text-orange-500", size: 22, pulse: true, glow: false };
  return               { show: true, color: "text-red-500",    size: 24, pulse: true, glow: true };
}

export default function QuizTaker({ questions, bankId, mode, resumeFrom = 0, resumeScore = 0, onExit }: Props) {
  const [index, setIndex] = useState(resumeFrom);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(resumeScore);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [peakStreak, setPeakStreak] = useState(0);
  const [lastStreakEnd, setLastStreakEnd] = useState<number | null>(null);
  const [fireDying, setFireDying] = useState(false);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [bestStreak] = useState(() => getBestStreak(bankId));
  const [analysis, setAnalysis] = useState<{ gaps: string[]; suggestion: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const OPTION_KEYS = ["A", "B", "C", "D"] as const;

  const q = questions[index];
  const isCorrect = selected === q?.correct;
  const isLast = index === questions.length - 1;

  // Save progress after each advance
  useEffect(() => {
    if (!done && index > 0) {
      saveProgress(bankId, {
        index,
        score,
        mode,
        questionIds: questions.map(q => q.id),
      });
    }
  }, [index]);

  useEffect(() => {
    if (!done || wrongIds.length === 0) return;
    const wrongQuestions = questions.filter((q) => wrongIds.includes(q.id));
    setAnalyzing(true);
    fetch("/api/quiz/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wrong_questions: wrongQuestions, total: questions.length, correct: score }),
    })
      .then((r) => r.json())
      .then((d) => { setAnalysis(d); setAnalyzing(false); })
      .catch(() => setAnalyzing(false));
  }, [done]);

  function handleCheck() {
    if (!selected) return;
    setChecked(true);
    if (selected === q.correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPeakStreak(p => Math.max(p, newStreak));
      setScore(s => s + 1);
    } else {
      if (streak >= 3) {
        setFireDying(true);
        setTimeout(() => setFireDying(false), 600);
      }
      setLastStreakEnd(streak);
      setStreak(0);
      const newWrongIds = wrongIds.includes(q.id) ? wrongIds : [...wrongIds, q.id];
      setWrongIds(newWrongIds);
    }
  }

  function handleNext() {
    if (isLast) {
      // Save final state
      updateBestStreak(bankId, peakStreak);
      saveWrongIds(bankId, wrongIds);
      clearProgress(bankId);
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setSelected(null);
      setChecked(false);
      setLastStreakEnd(null);
    }
  }

  function handleRestart() {
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setScore(0);
    setDone(false);
    setStreak(0);
    setPeakStreak(0);
    setLastStreakEnd(null);
    clearProgress(bankId);
    setAnalysis(null);
    setAnalyzing(false);
    setWrongIds([]);
  }

  const fire = getFireStyle(streak);
  const newBest = peakStreak > bestStreak;

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
        <div className="text-5xl font-bold text-ink-50">{pct}%</div>
        <div className="text-ink-300 text-sm">{score} / {questions.length} correct</div>

        {peakStreak >= 3 && (
          <div className="flex items-center gap-1.5 text-sm">
            <Flame size={16} className={newBest ? "text-red-400" : "text-orange-400"} />
            <span className={newBest ? "text-red-300 font-medium" : "text-ink-300"}>
              {newBest ? `New best streak: ${peakStreak}` : `Best streak: ${peakStreak}`}
            </span>
          </div>
        )}

        {bestStreak > 0 && !newBest && (
          <p className="text-xs text-ink-500">All-time best: {bestStreak} 🔥</p>
        )}

        {wrongIds.length > 0 && (
          <div className="w-full max-w-sm text-left">
            {analyzing ? (
              <div className="flex items-center gap-2 text-xs text-ink-400 px-3 py-2.5 rounded-lg bg-ink-900/40 border border-ink-800">
                <Loader2 size={12} className="animate-spin shrink-0" />
                Analyzing your results…
              </div>
            ) : analysis && (analysis.gaps.length > 0 || analysis.suggestion) ? (
              <div className="p-4 rounded-xl border border-ink-700 bg-ink-900/40 space-y-3">
                <p className="text-[11px] font-medium text-ink-400 uppercase tracking-wider">Study focus</p>
                {analysis.gaps.length > 0 && (
                  <ul className="space-y-1.5">
                    {analysis.gaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-200">
                        <span className="text-accent shrink-0 mt-0.5">•</span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                )}
                {analysis.suggestion && (
                  <p className="text-xs text-ink-400 leading-relaxed border-t border-ink-800 pt-3">
                    {analysis.suggestion}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-ink-950 font-medium text-sm hover:bg-accent-muted hover:text-white transition-colors"
          >
            <RotateCcw size={15} />
            Try again
          </button>
          {onExit ? (
            <button
              onClick={onExit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-ink-700 text-ink-300 font-medium text-sm hover:bg-ink-800 transition-colors"
            >
              <ChevronLeft size={15} />
              All quizzes
            </button>
          ) : (
            <Link
              href="/quiz-banks"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-ink-700 text-ink-300 font-medium text-sm hover:bg-ink-800 transition-colors"
            >
              <ChevronLeft size={15} />
              All quizzes
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>Question {index + 1} / {questions.length}</span>
        {q.chapter && <span className="text-ink-500 truncate max-w-[180px]">{q.chapter}</span>}
        <div className="flex items-center gap-2">
          {fire.show && (
            <span className={`flex items-center gap-0.5 transition-all duration-300 ${fireDying ? "opacity-0 scale-50" : "opacity-100 scale-100"}`}>
              <Flame
                size={fire.size}
                className={`${fire.color} ${fire.pulse ? "animate-pulse" : ""} ${fire.glow ? "drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" : ""} transition-all duration-300`}
              />
              <span className={`font-semibold tabular-nums ${fire.color}`}>{streak}</span>
            </span>
          )}
          <span>{score} correct</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-ink-800 rounded-full h-1">
        <div
          className="bg-accent h-1 rounded-full transition-all"
          style={{ width: `${((index + (checked ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="p-5 rounded-xl border border-ink-700 bg-ink-900/70">
        <p className="text-ink-50 font-medium leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
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

      {/* Feedback */}
      {checked && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${
          isCorrect
            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
            : "bg-rose-500/10 border border-rose-500/30 text-rose-200"
        }`}>
          {isCorrect
            ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            : <XCircle size={16} className="mt-0.5 shrink-0" />}
          <div>
            <span className="font-medium">
              {isCorrect ? "Correct!" : `Wrong — answer is ${q.correct}.`}
            </span>
            {!isCorrect && lastStreakEnd !== null && lastStreakEnd >= 3 && (
              <p className="mt-0.5 text-xs opacity-70">🔥 Your streak lasted {lastStreakEnd} questions</p>
            )}
            {q.explanation && <p className="mt-1 text-xs opacity-80">{q.explanation}</p>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        {onExit && (
          <button onClick={onExit} className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-300 transition-colors">
            <ChevronLeft size={13} />
            Exit
          </button>
        )}
        <div className="ml-auto">
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
    </div>
  );
}
