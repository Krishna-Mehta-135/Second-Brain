import { SyncProvider } from "@/lib/sync/SyncContext";
import { ClientEditor } from "./ClientEditor";

interface Props {
  params: Promise<{ docId: string }>;
}

/*
 * File intent: Document workspace route.
 * Renders the collaboration editor for a specific document ID.
 */
export default async function DocumentPage({ params }: Props) {
  const { docId } = await params;
  return (
    <SyncProvider key={docId} docId={docId}>
      <ClientEditor />
    </SyncProvider>
  );
}
