import { SyncProvider } from "@/lib/sync/SyncContext";
import { EditorPage } from "@/components/editor/EditorPage";
import { use } from "react";

interface Props {
  params: Promise<{ docId: string }>;
}

export default function DocumentPage({ params }: Props) {
  const { docId } = use(params);

  return (
    <SyncProvider docId={docId}>
      <EditorPage />
    </SyncProvider>
  );
}
