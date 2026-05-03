import { useBacklinks } from "@/lib/documents/useBacklinks";
import { Link2, FileText } from "lucide-react";
import Link from "next/link";

interface BacklinksPanelProps {
  docId: string;
  compact?: boolean;
}

/** Purple card styling aligned with landing-page interactive preview */
function BacklinkCard({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-lg overflow-hidden bg-[hsl(var(--sb-bg))/0.85] border border-[hsl(var(--sb-accent))/0.22] shadow-[0_0_0_1px_rgba(117,73,187,0.08)] hover:border-[hsl(var(--sb-accent))/0.55] hover:shadow-[0_6px_24px_-8px_rgba(117,73,187,0.45)] transition-all"
    >
      <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-[hsl(var(--sb-accent))/0.12] bg-[hsl(var(--sb-accent))/0.06]">
        <span className="text-[11px] font-semibold text-white flex items-center gap-1 truncate">
          <FileText
            size={10}
            className="text-[hsl(var(--sb-accent))] shrink-0"
          />
          {title || "Untitled"}
        </span>
        <span className="text-[9px] text-[hsl(var(--sb-accent))/0.7] uppercase tracking-wide shrink-0">
          Wiki link to this note
        </span>
      </div>
      <p className="px-2.5 py-2 text-[10px] text-[hsl(var(--sb-text-muted))] leading-snug">
        Mentioned via{" "}
        <span className="font-mono text-[hsl(var(--sb-accent))]">
          [[{title}]]
        </span>{" "}
        in another document.
      </p>
    </Link>
  );
}

export function BacklinksPanel({
  docId,
  compact = false,
}: BacklinksPanelProps) {
  const { backlinks, isLoading } = useBacklinks(docId);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="font-semibold text-[10px] tracking-wider text-[hsl(var(--sb-text-faint))] uppercase mb-2 flex items-center gap-1.5">
          <Link2 size={10} className="text-[hsl(var(--sb-accent))]/80" />
          Backlinks{" "}
          <span className="text-[hsl(var(--sb-accent))/0.7] normal-case ml-1">
            {backlinks.length > 0 ? `(${backlinks.length})` : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((k) => (
              <div
                key={k}
                className="h-[72px] rounded-lg bg-[hsl(var(--sb-bg-hover))]/40 border border-[hsl(var(--sb-border))] animate-pulse"
              />
            ))}
          </div>
        ) : backlinks.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-[hsl(var(--sb-text-muted))] leading-relaxed">
              Nothing links here yet. Type{" "}
              <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--sb-bg))] border border-[hsl(var(--sb-accent))/0.25] text-[hsl(var(--sb-accent))]">
                [[Title]]
              </code>{" "}
              in any note that exists in this workspace.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {backlinks.map((link) => (
              <BacklinkCard
                key={link.id}
                href={`/documents/${link.id}`}
                title={link.title}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-16 pt-8 border-t border-[hsl(var(--sb-border))]">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[hsl(var(--sb-accent))]" />
          Linked here
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[1, 2].map((k) => (
            <div
              key={k}
              className="h-24 rounded-lg bg-[hsl(var(--sb-bg-hover))]/50 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (backlinks.length === 0) return null;

  return (
    <div className="mt-16 pt-8 border-t border-[hsl(var(--sb-accent))/0.15]">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-[hsl(var(--sb-accent))]" />
        Backlinks ·{" "}
        <span className="font-normal text-[hsl(var(--sb-text-muted))]">
          {backlinks.length} note{backlinks.length === 1 ? "" : "s"} link here
        </span>
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {backlinks.map((link) => (
          <BacklinkCard
            key={link.id}
            href={`/documents/${link.id}`}
            title={link.title}
          />
        ))}
      </div>
    </div>
  );
}
