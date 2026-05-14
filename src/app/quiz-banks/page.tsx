import Link from "next/link";
import { ClipboardList, ChevronRight } from "lucide-react";
import { createClient, getAdminUser } from "@/lib/supabase/server";
import QuizBankUploadForm from "@/components/QuizBankUploadForm";
import type { QuizBank } from "@/lib/types";

export const revalidate = 0;

async function fetchBanks(): Promise<QuizBank[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quiz_banks")
    .select("id, title, description, created_at")
    .order("created_at", { ascending: false });
  if (error) return [];

  const banks = (data ?? []) as QuizBank[];

  const counts = await Promise.all(
    banks.map(async (b) => {
      const { count } = await supabase
        .from("quiz_questions")
        .select("id", { count: "exact", head: true })
        .eq("quiz_bank_id", b.id);
      return count ?? 0;
    }),
  );

  return banks
    .map((b, i) => ({ ...b, question_count: counts[i] }))
    .filter((b) => (b.question_count ?? 0) > 0);
}

export default async function QuizBanksPage() {
  const [banks, admin] = await Promise.all([fetchBanks(), getAdminUser()]);

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-50">Quiz Banks</h1>
        <p className="text-sm text-ink-300 mt-1">
          Interactive quizzes from uploaded question banks.
        </p>
      </div>

      <div className={admin ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6" : ""}>
        <div>
          {banks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-ink-700 rounded-xl bg-ink-900/40">
              <ClipboardList size={36} className="text-ink-600 mb-4" />
              <p className="text-ink-200 font-medium">No quiz banks yet</p>
              <p className="text-sm text-ink-400 mt-1">
                Ask the admin to upload a quiz DOCX to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {banks.map((bank) => (
                <Link
                  key={bank.id}
                  href={`/quiz-banks/${bank.id}`}
                  className="flex items-center justify-between p-5 rounded-xl border border-ink-700 bg-ink-900/40 hover:bg-ink-800/60 hover:border-ink-600 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink-50 group-hover:text-white truncate">
                      {bank.title}
                    </p>
                    {bank.description && (
                      <p className="text-sm text-ink-400 mt-0.5 line-clamp-1">
                        {bank.description}
                      </p>
                    )}
                    <p className="text-xs text-ink-500 mt-1">
                      {bank.question_count} question{bank.question_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-ink-500 group-hover:text-ink-300 shrink-0 ml-4" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {admin && (
          <aside>
            <QuizBankUploadForm />
          </aside>
        )}
      </div>
    </div>
  );
}
