// Storage abstraction — all quiz persistence goes through here.
// When student auth ships (Phase 5), swap these bodies to Supabase calls.

import type { QuizQuestion } from "./types";

const key = {
  progress: (bankId: string) => `quiz_progress_${bankId}`,
  bestStreak: (bankId: string) => `quiz_best_streak_${bankId}`,
  wrongIds: (bankId: string) => `quiz_wrong_ids_${bankId}`,
};

export interface QuizProgress {
  index: number;
  score: number;
  mode: "full" | "random";
  questionIds: string[];
}

function read<T>(k: string): T | null {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}
function remove(k: string) {
  try { localStorage.removeItem(k); } catch {}
}

export function getProgress(bankId: string): QuizProgress | null {
  return read<QuizProgress>(key.progress(bankId));
}
export function saveProgress(bankId: string, p: QuizProgress) {
  write(key.progress(bankId), p);
}
export function clearProgress(bankId: string) {
  remove(key.progress(bankId));
}

export function getBestStreak(bankId: string): number {
  return read<number>(key.bestStreak(bankId)) ?? 0;
}
export function updateBestStreak(bankId: string, streak: number) {
  if (streak > getBestStreak(bankId)) write(key.bestStreak(bankId), streak);
}

export function getWrongIds(bankId: string): string[] {
  return read<string[]>(key.wrongIds(bankId)) ?? [];
}
export function saveWrongIds(bankId: string, ids: string[]) {
  write(key.wrongIds(bankId), ids);
}
