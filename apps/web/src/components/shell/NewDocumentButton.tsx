"use client";

import { useState } from "react";
import { Button, LoadingSpinner } from "@repo/ui";
import { useDocuments } from "@/lib/documents/useDocuments";
import { Plus } from "lucide-react";

export function NewDocumentButton() {
  const { createDocument } = useDocuments();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    setIsCreating(true);
    try {
      await createDocument();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Button
      onClick={handleCreate}
      disabled={isCreating}
      variant="default"
      size="sm"
      className="w-full justify-start gap-2 bg-brand hover:opacity-90 text-white"
    >
      {isCreating ? (
        <LoadingSpinner size="sm" className="text-white" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      New document
    </Button>
  );
}
