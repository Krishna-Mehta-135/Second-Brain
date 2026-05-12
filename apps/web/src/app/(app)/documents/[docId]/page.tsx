"use client";

import { useEffect, useState } from "react";
import { SyncProvider } from "@/lib/sync/SyncContext";
import { ClientEditor } from "./ClientEditor";
import { useDocuments } from "@/lib/documents/useDocuments";
import { JoinWorkspaceGate } from "@/components/auth/JoinWorkspaceGate";
import { LoadingSpinner } from "@repo/ui";
import { useParams } from "next/navigation";

/*
 * File intent: Document workspace route.
 * Renders the collaboration editor or a join gate if the user lacks access.
 */
export default function DocumentPage() {
  const params = useParams();
  const docId = params.docId as string;

  const { documents, isLoading: docsLoading } = useDocuments();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [metadata, setMetadata] = useState<{
    title: string;
    workspace: {
      id: string;
      name: string;
      slug: string;
      isPublic: boolean;
    };
  } | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  useEffect(() => {
    if (docsLoading) return;

    const found = documents.find((d) => d.id === docId);
    if (found) {
      setHasAccess(true);
    } else {
      // Not in local cache, might be a member but cache is stale,
      // or truly not a member. Check metadata.
      setLoadingMetadata(true);
      fetch(`/api/documents/${docId}/metadata`)
        .then((res) => {
          if (res.status === 200) return res.json();
          throw new Error("No access");
        })
        .then((data) => {
          setMetadata(data);
          const payload = data?.data || data;
          // If the document itself is public, allow viewing regardless of workspace membership.
          // If the workspace is public, also allow viewing (AppShell will show Join button).
          if (payload.isPublic || payload.workspace?.isPublic) {
            setHasAccess(true);
          } else {
            setHasAccess(false);
          }
        })
        .catch(() => {
          setHasAccess(false);
        })
        .finally(() => {
          setLoadingMetadata(false);
        });
    }
  }, [docId, documents, docsLoading]);

  if (docsLoading || (hasAccess === null && loadingMetadata)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoadingSpinner className="w-8 h-8 text-[hsl(var(--sb-accent))]" />
      </div>
    );
  }

  if (hasAccess === false) {
    if (metadata?.workspace) {
      return (
        <JoinWorkspaceGate
          docTitle={metadata.title}
          workspace={metadata.workspace}
        />
      );
    }

    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">
          Document Not Found
        </h2>
        <p className="text-[hsl(var(--sb-text-muted))] max-w-md">
          This document doesn&apos;t exist or you don&apos;t have permission to
          view its metadata.
        </p>
      </div>
    );
  }

  return (
    <SyncProvider key={docId} docId={docId}>
      <ClientEditor />
    </SyncProvider>
  );
}
