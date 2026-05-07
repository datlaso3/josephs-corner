import BrowseControls from "@/components/BrowseControls";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow } from "@/lib/types";

export const revalidate = 0; // always fresh

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
  const categories = Array.from(
    new Set(docs.map((d) => d.category).filter((x): x is string => !!x)),
  ).sort();
  const tags = Array.from(
    new Set(docs.flatMap((d) => d.tags ?? [])),
  ).sort();

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <section className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink-50">
          A small library of study notes.
        </h1>
        <p className="mt-2 text-ink-200 max-w-2xl">
          Browse PDFs, docs, slides, and markdown notes. Searchable. Free to read.
        </p>
      </section>

      <BrowseControls docs={docs} categories={categories} tags={tags} />
    </div>
  );
}
