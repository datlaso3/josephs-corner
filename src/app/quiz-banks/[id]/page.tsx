import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuizBank, QuizQuestion } from "@/lib/types";
import QuizTaker from "@/components/QuizTaker";

export const revalidate = 0;

async function fetchBank(id: string): Promise<{ bank: QuizBank; questions: QuizQuestion[] } | null> {
  const supabase = createClient();

  const { data: bank, error: bankError } = await supabase
    .from("quiz_banks")
    .select("*")
    .eq("id", id)
    .single();

  if (bankError || !bank) return null;

  const { data: questions, error: qError } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_bank_id", id)
    .order("sort_order", { ascending: true });

  if (qError) return null;

  return { bank: bank as QuizBank, questions: (questions ?? []) as QuizQuestion[] };
}

export default async function QuizBankPage({ params }: { params: { id: string } }) {
  const result = await fetchBank(params.id);
  if (!result) notFound();

  const { bank, questions } = result;

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <Link
        href="/quiz-banks"
        className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-200 transition-colors mb-6"
      >
        <ChevronLeft size={15} />
        Quiz Banks
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-50">{bank.title}</h1>
        {bank.description && (
          <p className="text-sm text-ink-300 mt-1">{bank.description}</p>
        )}
        <p className="text-xs text-ink-500 mt-1">{questions.length} questions</p>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16 text-ink-400 text-sm">
          No questions found in this quiz bank.
        </div>
      ) : (
        <QuizTaker questions={questions} />
      )}
    </div>
  );
}
