import Link from "next/link";
import { BookOpen, Brain, ClipboardList, ArrowRight } from "lucide-react";
import StudyLayout from "@/components/StudyLayout";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow } from "@/lib/types";

export const revalidate = 60;

async function fetchDocs(): Promise<DocumentRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load documents:", error.message);
    return [];
  }
  return (data ?? []) as DocumentRow[];
}

const tools = [
  {
    icon: BookOpen,
    title: "Library",
    description: "Browse all uploaded notes, slides, and documents across every subject.",
    href: "#library",
    cta: "Browse documents",
  },
  {
    icon: Brain,
    title: "Generate Quiz",
    description: "Open any document and get a 10-question AI quiz tailored to its content.",
    href: "#library",
    cta: "Pick a document",
  },
  {
    icon: ClipboardList,
    title: "Quiz Banks",
    description: "Practice from curated question sets built from your course materials.",
    href: "/quiz-banks",
    cta: "Go to quiz banks",
  },
];

export default async function Home() {
  const docs = await fetchDocs();

  return (
    <>
      {/* Hero */}
      <section className="border-b border-ink-700/60 bg-ink-950">
        <div className="max-w-7xl mx-auto px-5 py-14 sm:py-20">
          <p className="text-xs font-semibold tracking-widest uppercase text-accent mb-3">
            Joseph&apos;s Corner
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-ink-50 max-w-2xl leading-tight">
            Study tools for every subject.
          </h1>
          <p className="mt-4 text-ink-300 max-w-xl text-base leading-relaxed">
            Browse your study materials, generate AI quizzes from any document, and test yourself
            with curated question banks — all in one place.
          </p>
        </div>
      </section>

      {/* Tool cards */}
      <section className="max-w-7xl mx-auto px-5 py-10">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-5">
          What you can do
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tools.map(({ icon: Icon, title, description, href, cta }) => (
            <Link
              key={title}
              href={href}
              className="group flex flex-col gap-4 rounded-xl border border-ink-700 bg-ink-900/60 p-6 hover:border-ink-500 hover:bg-ink-800/60 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-ink-800 border border-ink-700 grid place-items-center text-accent">
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-ink-50 mb-1">{title}</h3>
                <p className="text-sm text-ink-300 leading-relaxed">{description}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-400 group-hover:text-accent transition-colors">
                {cta} <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Document library */}
      <section id="library" className="border-t border-ink-700/60">
        <div className="max-w-7xl mx-auto px-5 pt-8">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-1">
            Document Library
          </h2>
          <p className="text-sm text-ink-400">
            {docs.length} {docs.length === 1 ? "document" : "documents"} uploaded
          </p>
        </div>
        <StudyLayout docs={docs} />
      </section>
    </>
  );
}
