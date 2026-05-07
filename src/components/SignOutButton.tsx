"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-white"
    >
      <LogOut size={14} />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
