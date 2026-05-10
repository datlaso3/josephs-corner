import type { Metadata } from "next";
import Link from "next/link";
import AppSidebar from "@/components/AppSidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Joseph's Corner",
  description: "A small library of study documents — searchable, public to read.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header — hidden on lg where sidebar takes over */}
          <header className="lg:hidden border-b border-ink-700/80 bg-ink-950/80 backdrop-blur sticky top-0 z-20">
            <div className="px-5 py-3 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-accent-muted shadow-card grid place-items-center">
                  <span className="text-ink-950 font-bold text-sm">J</span>
                </div>
                <span className="font-semibold tracking-tight text-ink-100 group-hover:text-white transition-colors">
                  Joseph&rsquo;s Corner
                </span>
              </Link>
              <Link href="/admin" className="text-sm text-ink-400 hover:text-white transition-colors">
                Admin
              </Link>
            </div>
          </header>

          <main className="flex-1 w-full">{children}</main>

          <footer className="border-t border-ink-700/80 mt-16">
            <div className="max-w-5xl mx-auto px-5 py-6 text-xs text-ink-400 flex items-center justify-between">
              <span>Joseph&rsquo;s Corner &copy; {new Date().getFullYear()}</span>
              <span className="opacity-70">Study notes, neatly stacked.</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
