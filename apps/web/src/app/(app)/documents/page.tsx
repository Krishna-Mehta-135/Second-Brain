import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://127.0.0.1:8000";

interface DocumentContent {
  id: string;
  type: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default async function DocumentsPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) redirect("/login");

  let res;
  try {
    res = await fetch(`${API_URL}/api/v1/content`, {
      headers: { Authorization: `Bearer ${session}` },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[DocumentsPage] Fetch failed:", err);
    // Continue to show empty state if network fails
  }

  if (res?.status === 401) {
    redirect("/login");
  }

  if (res?.ok) {
    const json = await res.json();
    // Backend returns { data: [...] }
    const docs = (json.data || []).filter(
      (c: DocumentContent) => c.type === "document",
    );

    console.log(`[DocumentsPage] Found ${docs.length} documents`);

    if (docs.length > 0) {
      const firstDocId = docs[0].id;
      console.log(
        `[DocumentsPage] Redirecting to first document: ${firstDocId}`,
      );

      if (firstDocId && firstDocId !== "documents") {
        redirect(`/documents/${firstDocId}`);
      } else {
        console.warn(
          `[DocumentsPage] Invalid firstDocId detected: "${firstDocId}". Avoiding redirect loop.`,
        );
      }
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center h-full bg-[hsl(var(--sb-bg))] text-white p-6">
      <div className="text-center space-y-6 max-w-sm sb-animate-in">
        <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--sb-bg-panel))] border border-[hsl(var(--sb-border))] flex items-center justify-center mx-auto sb-glow">
          <FileText size={32} className="text-[hsl(var(--sb-accent))]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Your brain is empty
          </h2>
          <p className="text-[hsl(var(--sb-text-muted))] text-sm leading-relaxed">
            Create your first document to start capturing knowledge and
            collaborating in real-time.
          </p>
        </div>
        <Link
          href="/documents/new"
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg,#6366f1,#7c3aed)",
            boxShadow:
              "0 4px 20px rgba(99,102,241,0.35),0 1px 0 rgba(255,255,255,0.1) inset",
          }}
        >
          <Plus size={18} />
          Create first document
        </Link>
      </div>
    </div>
  );
}
