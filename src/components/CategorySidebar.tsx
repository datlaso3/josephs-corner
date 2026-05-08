"use client";

import { ChevronDown, ChevronRight, Search, X, BookOpen } from "lucide-react";
import { useMemo, useState } from "react";
import type { DocumentRow } from "@/lib/types";

interface SidebarProps {
  docs: DocumentRow[];
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  onSelect: (category: string | null, subcategory: string | null) => void;
}

interface CategoryNode {
  name: string;
  subcategories: { name: string; count: number }[];
  count: number;
}

function buildTree(docs: DocumentRow[]): CategoryNode[] {
  const map = new Map<string, Map<string, number>>();

  for (const doc of docs) {
    const cat = doc.category ?? "Uncategorized";
    const sub = doc.subcategory ?? "";
    if (!map.has(cat)) map.set(cat, new Map());
    const subMap = map.get(cat)!;
    subMap.set(sub, (subMap.get(sub) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, subMap]) => {
      const subcategories = Array.from(subMap.entries())
        .filter(([s]) => s !== "")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([s, count]) => ({ name: s, count }));
      const count = Array.from(subMap.values()).reduce((a, b) => a + b, 0);
      return { name, subcategories, count };
    });
}

export default function CategorySidebar({
  docs,
  selectedCategory,
  selectedSubcategory,
  onSelect,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(docs), [docs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    return tree
      .map((cat) => ({
        ...cat,
        subcategories: cat.subcategories.filter((s) =>
          s.name.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (cat) =>
          cat.name.toLowerCase().includes(q) || cat.subcategories.length > 0,
      );
  }, [tree, search]);

  function toggle(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  const totalDocs = docs.length;

  return (
    <aside className="w-60 shrink-0 flex flex-col gap-1">
      {/* Search */}
      <div className="relative mb-2">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
        />
        <input
          type="search"
          placeholder="Filter categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base text-sm pl-8 pr-7 py-1.5"
          aria-label="Filter categories"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white"
            aria-label="Clear"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* All documents */}
      <button
        onClick={() => onSelect(null, null)}
        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-sm transition-colors ${
          !selectedCategory
            ? "bg-accent/10 text-accent"
            : "text-ink-200 hover:bg-ink-700 hover:text-white"
        }`}
      >
        <span className="flex items-center gap-2">
          <BookOpen size={14} />
          All documents
        </span>
        <Badge count={totalDocs} active={!selectedCategory} />
      </button>

      <div className="border-t border-ink-700 my-1" />

      {/* Category tree */}
      {filtered.length === 0 && (
        <p className="text-xs text-ink-400 px-2 py-3">No categories found.</p>
      )}

      {filtered.map((cat) => {
        const isOpen = !collapsed.has(cat.name);
        const catActive = selectedCategory === cat.name && !selectedSubcategory;

        return (
          <div key={cat.name}>
            <div className="flex items-center gap-0.5">
              {/* Collapse toggle */}
              {cat.subcategories.length > 0 ? (
                <button
                  onClick={() => toggle(cat.name)}
                  className="p-1 text-ink-400 hover:text-white transition-colors"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              ) : (
                <span className="w-6" />
              )}

              {/* Category button */}
              <button
                onClick={() => onSelect(cat.name, null)}
                className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors ${
                  catActive
                    ? "bg-accent/10 text-accent"
                    : "text-ink-100 hover:bg-ink-700 hover:text-white"
                }`}
              >
                <span className="font-medium truncate">{cat.name}</span>
                <Badge count={cat.count} active={catActive} />
              </button>
            </div>

            {/* Subcategories */}
            {isOpen && cat.subcategories.length > 0 && (
              <div className="ml-6 mt-0.5 flex flex-col gap-0.5">
                {cat.subcategories.map((sub) => {
                  const subActive =
                    selectedCategory === cat.name &&
                    selectedSubcategory === sub.name;
                  return (
                    <button
                      key={sub.name}
                      onClick={() => onSelect(cat.name, sub.name)}
                      className={`flex items-center justify-between w-full px-2.5 py-1 rounded-md text-xs transition-colors ${
                        subActive
                          ? "bg-accent/10 text-accent"
                          : "text-ink-300 hover:bg-ink-700 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{sub.name}</span>
                      <Badge count={sub.count} active={subActive} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

function Badge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
        active ? "bg-accent/20 text-accent" : "bg-ink-700 text-ink-300"
      }`}
    >
      {count}
    </span>
  );
}
