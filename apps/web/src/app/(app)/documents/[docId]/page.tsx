"use client";

import { useParams } from "next/navigation";
import { useDocuments } from "@/lib/documents/useDocuments";
import { useDocument } from "@/lib/sync/useDocument";
import { LoadingSpinner, StatusDot } from "@repo/ui";
import { formatRelativeTime } from "@/lib/utils/time";
import { FileText, Globe, Users } from "lucide-react";
import { CollaborativeEditor } from "@/components/CollaborativeEditor";

export default function DocumentPage() {
  const { docId } = useParams();
  const { documents, isLoading: docsLoading } = useDocuments();
  const { status } = useDocument();

  const doc = documents.find((d) => d.id === docId);
  const isTemp = docId?.toString().startsWith("temp-");

  if (docsLoading && !doc) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center h-full p-8 text-center">
        <div className="space-y-4">
          <p className="text-4xl">🔍</p>
          <h2 className="text-xl font-semibold">Document not found</h2>
          <p className="text-muted-foreground">
            The document you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-sm">/</span>
          </div>
          <h1 className="font-medium truncate max-w-50 sm:max-w-100">
            {doc.title || "Untitled"}
            {isTemp && (
              <span className="ml-2 text-xs text-muted-foreground animate-pulse">
                (Saving...)
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <StatusDot
            status={status === "connected" ? "online" : status}
            className="hidden sm:flex"
          />
          <div className="flex -space-x-2">
            {/* Real users would be mapped here */}
            <div className="w-7 h-7 rounded-full bg-brand/10 border-2 border-background flex items-center justify-center text-[10px] font-bold text-brand">
              U
            </div>
          </div>
          <button className="text-xs font-medium bg-surface hover:bg-surface-hover px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 border border-border">
            <Users className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </header>

      {/* Editor Content */}
      <div className="flex-1 p-8 sm:p-12 md:p-16 lg:p-24 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-extrabold tracking-tight">
              {doc.title || "Untitled"}
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              Last edited {formatRelativeTime(doc.updatedAt)}
            </p>
          </div>

          <div className="min-h-100">
            <CollaborativeEditor docId={docId as string} />
          </div>
        </div>
      </div>
    </div>
  );
}
