import { useBacklinks } from "@/lib/documents/useBacklinks";
import { Link2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@repo/ui";

export function BacklinksPanel({ docId }: { docId: string }) {
  const { backlinks, isLoading } = useBacklinks(docId);

  if (isLoading) {
    return (
      <div className="mt-16 pt-8 border-t border-[hsl(var(--sb-border))]">
        <h3 className="text-sm font-semibold text-[hsl(var(--sb-text))] mb-4 flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Linked to this document
        </h3>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-40 rounded-md" />
        </div>
      </div>
    );
  }

  if (backlinks.length === 0) return null;

  return (
    <div className="mt-16 pt-8 border-t border-[hsl(var(--sb-border))]">
      <h3 className="text-sm font-semibold text-[hsl(var(--sb-text))] mb-4 flex items-center gap-2">
        <Link2 className="h-4 w-4" />
        Linked to this document
      </h3>
      <div className="flex flex-wrap gap-2">
        {backlinks.map((link) => (
          <Link
            key={link.id}
            href={`/documents/${link.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--sb-bg-panel))] border border-[hsl(var(--sb-border))] text-[13px] text-[hsl(var(--sb-text-muted))] hover:text-[hsl(var(--sb-accent))] hover:border-[hsl(var(--sb-accent))]/50 transition-colors shadow-sm group"
          >
            <span className="text-[hsl(var(--sb-accent))]/50 group-hover:text-[hsl(var(--sb-accent))] transition-colors">
              [[
            </span>
            <span className="font-medium">{link.title}</span>
            <span className="text-[hsl(var(--sb-accent))]/50 group-hover:text-[hsl(var(--sb-accent))] transition-colors">
              ]]
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
