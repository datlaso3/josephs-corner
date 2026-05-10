"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardList, Settings } from "lucide-react";

const navItems = [
  { href: "/", icon: BookOpen, label: "Library" },
  { href: "/quiz-banks", icon: ClipboardList, label: "Quizzes" },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-16 shrink-0 flex-col items-center py-4 gap-1 border-r border-ink-700/80 bg-ink-950 sticky top-0 h-screen z-30">
      <Link href="/" className="mb-4">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-accent to-accent-muted shadow-card grid place-items-center">
          <span className="text-ink-950 font-bold text-sm">J</span>
        </div>
      </Link>

      <nav className="flex flex-col items-center gap-1 flex-1 w-full px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg w-full transition-colors ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-ink-400 hover:bg-ink-800 hover:text-white"
              }`}
            >
              <Icon size={19} />
              <span className="text-[10px] leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/admin"
        className={`flex flex-col items-center gap-1 py-2 rounded-lg w-full transition-colors ${
          pathname.startsWith("/admin")
            ? "bg-accent/10 text-accent"
            : "text-ink-400 hover:bg-ink-800 hover:text-white"
        }`}
      >
        <Settings size={19} />
        <span className="text-[10px] leading-none">Admin</span>
      </Link>
    </aside>
  );
}
