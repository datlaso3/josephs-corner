import { ClipboardList } from "lucide-react";

export default function QuizBanksPage() {
  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-50">Quiz Banks</h1>
        <p className="text-sm text-ink-300 mt-1">
          Interactive quizzes from uploaded question banks.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 border border-dashed border-ink-700 rounded-xl bg-ink-900/40">
        <ClipboardList size={36} className="text-ink-600 mb-4" />
        <p className="text-ink-200 font-medium">No quiz banks yet</p>
        <p className="text-sm text-ink-400 mt-1">
          Ask the admin to upload a quiz DOCX to get started.
        </p>
      </div>
    </div>
  );
}
