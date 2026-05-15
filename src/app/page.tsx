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

export default async function Home() {
  const docs = await fetchDocs();

  return (
    <>
      <div className="border-b border-ink-700/60 px-5 py-8 max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink-50">
          A small library of study notes.
        </h1>
        <p className="mt-2 text-ink-200 max-w-2xl">
          Browse PDFs, docs, slides, and markdown notes. Searchable. Free to read.
        </p>
      </div>
      <StudyLayout docs={docs} />
    </>
  );
}
