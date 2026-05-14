import { redirect } from "next/navigation";
import { createClient, getAdminUser } from "@/lib/supabase/server";
import UploadForm from "@/components/UploadForm";
import AdminDocList from "@/components/AdminDocList";
import SignOutButton from "@/components/SignOutButton";
import type { DocumentRow } from "@/lib/types";

export const revalidate = 0;

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

export default async function AdminPage() {
  // Middleware already enforces admin-only access, but we re-check
  // here so non-admins can never see this page even if middleware is bypassed.
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/login");
  }

  const docs = await fetchDocs();
  const knownCategories = Array.from(
    new Set(docs.map((d) => d.category).filter((x): x is string => !!x)),
  ).sort();

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Admin</h1>
          <p className="text-sm text-ink-300">
            Signed in as {admin.email}.
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <section>
          <h2 className="text-sm uppercase tracking-wider text-ink-300 mb-3">
            Library ({docs.length})
          </h2>
          <AdminDocList docs={docs} />
        </section>

        <aside className="space-y-6">
          <UploadForm knownCategories={knownCategories} />
        </aside>
      </div>
    </div>
  );
}
