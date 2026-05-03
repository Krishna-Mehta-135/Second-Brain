"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDocuments } from "@/lib/documents/useDocuments";
import { LoadingSpinner } from "@repo/ui";

export default function NewDocumentPage() {
  const { createDocument } = useDocuments();
  const router = useRouter();
  const createdRef = useRef(false);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;

    async function init() {
      try {
        const doc = await createDocument();
        if (doc) {
          router.push(`/documents/${doc.id}`);
        } else {
          router.push("/documents");
        }
      } catch (err) {
        console.error("Failed to auto-create document:", err);
        router.push("/documents");
      }
    }

    init();
  }, [createDocument, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
      <div className="bg-[hsl(var(--sb-accent))]/10 p-4 rounded-2xl animate-pulse relative">
        <LoadingSpinner size="lg" className="text-[hsl(var(--sb-accent))]" />
      </div>
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-[hsl(var(--sb-text))]">
          Creating document
        </h2>
        <p className="text-sm text-[hsl(var(--sb-text-muted))]">
          Setting up your collaborative space...
        </p>
      </div>
    </div>
  );
}
