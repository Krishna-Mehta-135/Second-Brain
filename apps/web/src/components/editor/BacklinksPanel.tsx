import { useBacklinks } from "@/lib/documents/useBacklinks";
import { Link2, FileText } from "lucide-react";
import Link from "next/link";

interface BacklinksPanelProps {
  docId: string;
  /** When true renders the compact sidebar version; false = inline below editor */
  compact?: boolean;
}

export function BacklinksPanel({
  docId,
  compact = false,
}: BacklinksPanelProps) {
  const { backlinks, isLoading } = useBacklinks(docId);

  // ── Compact sidebar variant ──────────────────────────────────────────────
  if (compact) {
    return (
      <div className="space-y-1">
        <div className="font-semibold text-[10px] tracking-widest text-[hsl(var(--sb-text-faint))] uppercase mb-3 flex items-center gap-1.5">
          <Link2 size={10} />
          Backlinks {backlinks.length > 0 && `(${backlinks.length})`}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((k) => (
              <div
                key={k}
                className="h-7 rounded-md bg-[hsl(var(--sb-bg-hover))] animate-pulse"
              />
            ))}
          </div>
        ) : backlinks.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-[hsl(var(--sb-text-faint))] italic leading-relaxed">
              No backlinks yet.
            </p>
            <p className="text-[10px] text-[hsl(var(--sb-text-faint))] leading-relaxed">
              Type{" "}
              <code className="bg-[hsl(var(--sb-bg-hover))] px-1 py-0.5 rounded text-[hsl(var(--sb-accent))]">
                [[title]]
              </code>{" "}
              in any document to link here.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {backlinks.map((link) => (
              <Link
                key={link.id}
                href={`/documents/${link.id}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[hsl(var(--sb-text-muted))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors group"
              >
                <FileText
                  size={11}
                  className="text-[hsl(var(--sb-text-faint))] group-hover:text-[hsl(var(--sb-accent))] transition-colors shrink-0"
                />
                <span className="truncate">{link.title || "Untitled"}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Inline below-editor variant ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mt-16 pt-8 border-t border-[hsl(var(--sb-border))]">
        <h3 className="text-sm font-semibold text-[hsl(var(--sb-text))] mb-4 flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Linked to this document
        </h3>
        <div className="flex gap-2">
          <div className="h-8 w-32 rounded-md bg-[hsl(var(--sb-bg-hover))] animate-pulse" />
          <div className="h-8 w-40 rounded-md bg-[hsl(var(--sb-bg-hover))] animate-pulse" />
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
