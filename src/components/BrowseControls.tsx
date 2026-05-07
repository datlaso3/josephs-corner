"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DocumentRow } from "@/lib/types";
import { DocCard } from "./DocCard";

interface Props {
  docs: DocumentRow[];
  categories: string[];
  tags: string[];
}

export default function BrowseControls({ docs, categories, tags }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  // Persist last filters in the URL hash so reloads / shares preserve state.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("c", category);
    if (tag) params.set("t", tag);
    const hash = params.toString();
    if (typeof window !== "undefined") {
      const next = hash ? `#${hash}` : "";
      if (window.location.hash !== next) {
        window.history.replaceState(null, "", `${window.location.pathname}${next}`);
      }
    }
  }, [query, category, tag]);

  // Hydrate from hash on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = window.location.hash.replace(/^#/, "");
    if (!h) return;
    const params = new URLSearchParams(h);
    setQuery(params.get("q") ?? "");
    setCategory(params.get("c"));
    setTag(params.get("t"));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (category && d.category !== category) return false;
      if (tag && !(d.tags ?? []).includes(tag)) return false;
      if (!q) return true;
      const haystack = [
        d.title,
        d.description ?? "",
        d.category ?? "",
        ...(d.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [docs, query, category, tag]);

  const hasFilters = !!(query || category || tag);

  return (
    <>
      <div className="space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search by title, topic, or tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-base pl-9 pr-9"
            aria-label="Search documents"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ink-300 hover:text-white hover:bg-ink-700"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {(categories.length > 0 || tags.length > 0) && (
          <div className="flex flex-col gap-2">
            {categories.length > 0 && (
              <FilterRow
                label="Category"
                items={categories}
                selected={category}
                onSelect={setCategory}
              />
            )}
            {tags.length > 0 && (
              <FilterRow
                label="Tags"
                items={tags}
                selected={tag}
                onSelect={setTag}
                prefix="#"
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-ink-300 pt-1">
          <span>
            {filtered.length} {filtered.length === 1 ? "document" : "documents"}
            {hasFilters && ` of ${docs.length}`}
          </span>
          {hasFilters && (
            <button
              onClick={() => {
                setQuery("");
                setCategory(null);
                setTag(null);
              }}
              className="text-ink-200 hover:text-white underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState hasDocs={docs.length > 0} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((d) => (
              <DocCard key={d.id} doc={d} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function FilterRow({
  label,
  items,
  selected,
  onSelect,
  prefix = "",
}: {
  label: string;
  items: string[];
  selected: string | null;
  onSelect: (v: string | null) => void;
  prefix?: string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] uppercase tracking-wider text-ink-300 mr-1">
        {label}
      </span>
      {items.map((item) => {
        const active = selected === item;
        return (
          <button
            key={item}
            onClick={() => onSelect(active ? null : item)}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
              active
                ? "border-accent text-accent bg-accent/10"
                : "border-ink-600 text-ink-200 hover:border-ink-500 hover:text-white"
            }`}
          >
            {prefix}
            {item}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ hasDocs }: { hasDocs: boolean }) {
  return (
    <div className="text-center py-16 border border-dashed border-ink-700 rounded-xl bg-ink-900/40">
      <p className="text-ink-200">
        {hasDocs ? "No documents match your filters." : "No documents yet."}
      </p>
      <p className="text-sm text-ink-300 mt-1">
        {hasDocs
          ? "Try a different search term or clear the filters."
          : "Sign in as the admin to upload your first study doc."}
      </p>
    </div>
  );
}
