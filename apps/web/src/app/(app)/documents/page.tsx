import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// Redirect to most recently updated document, or show empty state
export default async function DocumentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  // In a real app, API_URL would be defined in env
  const apiUrl = process.env.API_URL || "http://localhost:9898";

  try {
    const res = await fetch(`${apiUrl}/api/v1/content?limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `session=${token}`, // For session-based auth
      },
      cache: "no-store",
    });

    if (res.ok) {
      const docs = await res.json();
      if (Array.isArray(docs) && docs.length > 0) {
        redirect(`/documents/${docs[0].id}`);
      }
    }
  } catch (err) {
    console.error("Failed to fetch documents for redirect:", err);
  }

  // No documents — show empty state
  return (
    <div className="flex-1 flex items-center justify-center p-8 h-full">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-4xl">📝</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            No documents yet
          </h2>
          <p className="text-muted-foreground">
            Create your first document to start collaborating in real-time.
          </p>
        </div>
        {/* We use a client-side button here via a wrapper or just the Sidebar button */}
        <p className="text-sm text-muted-foreground italic">
          Click &quot;New document&quot; in the sidebar to get started
        </p>
      </div>
    </div>
  );
}
