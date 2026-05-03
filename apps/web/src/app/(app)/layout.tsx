import { AppShell } from "@/components/shell/AppShell";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DocumentsProvider } from "@/lib/documents/useDocuments";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    redirect("/login");
  }

  return (
    <DocumentsProvider>
      <AppShell>{children}</AppShell>
    </DocumentsProvider>
  );
}
