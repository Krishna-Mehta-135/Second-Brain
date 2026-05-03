import { useBacklinks } from "@/lib/documents/useBacklinks";
import { Link2 } from "lucide-react";
import Link from "next/link";

interface BacklinksPanelProps {
  docId: string;
  compact?: boolean;
}

/** Inline purple [[Title]] — matches editor wiki-link look */
function BacklinkLine({ href, title }: { href: string; title: string }) {
  const safe = title?.trim() || "Untitled";
  return (
    <Link
      href={href}
      className="block text-[13px] font-medium text-[hsl(var(--sb-accent))] no-underline hover:text-[hsl(var(--sb-accent-glow))] hover:underline py-1.5 px-2 rounded-md hover:bg-[hsl(var(--sb-accent))]/8 transition-colors"
    >
      [[{safe}]]
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
      <div className="space-y-1">
        <div className="font-semibold text-[10px] tracking-wider text-[hsl(var(--sb-text-faint))] uppercase mb-2 flex items-center gap-1.5">
          <Link2 size={10} className="text-[hsl(var(--sb-accent))]/80" />
          Backlinks{" "}
          <span className="text-[hsl(var(--sb-accent))]/70 normal-case ml-1">
            {backlinks.length > 0 ? `(${backlinks.length})` : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((k) => (
              <div
                key={k}
                className="h-8 rounded-md bg-[hsl(var(--sb-bg-hover))]/40 border border-[hsl(var(--sb-border))] animate-pulse"
              />
            ))}
          </div>
        ) : backlinks.length === 0 ? (
          <p className="text-xs text-[hsl(var(--sb-text-muted))] leading-relaxed">
            Nothing links here yet. Add a{" "}
            <span className="text-[hsl(var(--sb-accent))] font-medium">
              [[Note title]]
            </span>{" "}
            in another note in this workspace.
          </p>
        ) : (
          <div className="rounded-lg border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))]/80 divide-y divide-[hsl(var(--sb-border))]/80 overflow-hidden">
            {backlinks.map((link) => (
              <BacklinkLine
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
              className="h-12 rounded-lg bg-[hsl(var(--sb-bg-hover))]/50 animate-pulse"
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
      <div className="rounded-lg border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))]/80 divide-y divide-[hsl(var(--sb-border))]/80 overflow-hidden max-w-2xl">
        {backlinks.map((link) => (
          <BacklinkLine
            key={link.id}
            href={`/documents/${link.id}`}
            title={link.title}
          />
        ))}
      </div>
    </div>
  );
}
