"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-ink-50">Admin sign in</h1>
          <p className="text-sm text-ink-300 mt-1">
            Only the configured admin email can sign in.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 p-5 rounded-xl border border-ink-700 bg-ink-900/70 shadow-card"
        >
          <label className="block">
            <span className="text-xs text-ink-300">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base mt-1"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-300">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base mt-1"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="text-sm text-rose-300 bg-rose-300/10 ring-1 ring-rose-300/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md bg-accent text-ink-950 font-medium text-sm hover:bg-accent-muted hover:text-white transition-colors disabled:opacity-60"
          >
            <LogIn size={15} />
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="text-center text-xs text-ink-300 mt-4">
          <Link href="/" className="hover:text-white">
            ← Back to library
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
