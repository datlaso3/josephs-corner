"use client";

import { useMemo, useState } from "react";
import type { DocumentRow } from "@/lib/types";
import CategorySidebar from "./CategorySidebar";
import { DocCard } from "./DocCard";
import { Search, X } from "lucide-react";

interface Props {
  docs: DocumentRow[];
}

export default function StudyLayout({ docs }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  function handleSelect(cat: string | null, sub: string | null) {
    setSelectedCategory(cat);
    setSelectedSubcategory(sub);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (selectedCategory && d.category !== selectedCategory) return false;
      if (selectedSubcategory && d.subcategory !== selectedSubcategory) return false;
      if (!q) return true;
      return [d.title, d.description ?? "", d.category ?? "", ...(d.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [docs, selectedCategory, selectedSubcategory, query]);

  const heading = selectedSubcategory ?? selectedCategory ?? "All Documents";

  return (
    <div className="flex gap-8 max-w-7xl mx-auto px-5 py-10">
      <CategorySidebar
        docs={docs}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSelect={handleSelect}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h2 className="text-xl font-semibold text-ink-50 truncate">{heading}</h2>

          {/* Search */}
          <div className="relative w-64 shrink-0">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
            />
            <input
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-base text-sm pl-8 pr-7 py-1.5"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-ink-400 mb-4">
          {filtered.length} {filtered.length === 1 ? "document" : "documents"}
          {(selectedCategory || query) && ` of ${docs.length}`}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-ink-700 rounded-xl bg-ink-900/40">
            <p className="text-ink-200">No documents match.</p>
            <p className="text-sm text-ink-300 mt-1">Try a different filter or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((d) => (
              <DocCard key={d.id} doc={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
