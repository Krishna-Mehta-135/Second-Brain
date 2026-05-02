"use client";

import { useParams } from "next/navigation";
import { SyncProvider } from "@/lib/sync/SyncContext";

export default function DocumentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const docId = params?.docId as string;

  if (!docId) return <>{children}</>;

  return <SyncProvider docId={docId}>{children}</SyncProvider>;
}
