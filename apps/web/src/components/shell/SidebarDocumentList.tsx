"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useDocuments } from "@/lib/documents/useDocuments";
import {
  Skeleton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@repo/ui";
import { formatRelativeTime } from "@/lib/utils/time";
import {
  FileText,
  MoreVertical,
  Trash2,
  ExternalLink,
  Copy,
  Edit2,
} from "lucide-react";

function fuzzyMatch(str: string, pattern: string): boolean {
  if (!pattern) return true;
  pattern = pattern.replace(/\s+/g, "").toLowerCase();
  str = str.toLowerCase();
  let patternIdx = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === pattern[patternIdx]) {
      patternIdx++;
      if (patternIdx === pattern.length) return true;
    }
  }
  return false;
}

export function SidebarDocumentList({ search }: { search: string }) {
  const { documents, isLoading, deleteDocument } = useDocuments();
  const pathname = usePathname();

  const filteredDocuments = documents.filter(
    (doc) =>
      fuzzyMatch(doc.title, search) ||
      doc.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="space-y-1 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="text-xs text-[hsl(var(--sb-text-faint))] px-2 py-4 text-center">
        No documents yet
      </p>
    );
  }

  if (filteredDocuments.length === 0 && search) {
    return (
      <p className="text-xs text-[hsl(var(--sb-text-faint))] px-2 py-4 text-center">
        No matches for &quot;{search}&quot;
      </p>
    );
  }

  return (
    <ul className="space-y-0.5 py-2">
      {filteredDocuments.map((doc) => {
        const isActive = pathname === `/documents/${doc.id}`;
        const isTemp = doc.id.startsWith("temp-");

        return (
          <li key={doc.id} className="group flex items-center gap-1">
            <Link
              href={isTemp ? "#" : `/documents/${doc.id}`}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors flex-1 min-w-0
                ${
                  isActive
                    ? "bg-[hsl(var(--sb-accent))]/10 !text-[hsl(var(--sb-accent))] font-medium"
                    : "!text-white/90 hover:bg-[hsl(var(--sb-bg-hover))] hover:!text-white"
                }
                ${isTemp ? "opacity-50 cursor-not-allowed" : ""}
              `}
              onClick={(e) => isTemp && e.preventDefault()}
            >
              <FileText
                className={`h-4 w-4 shrink-0 ${isActive ? "text-[hsl(var(--sb-accent))]" : "!text-white/50 group-hover:!text-white"}`}
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="truncate">{doc.title || "Untitled"}</span>
                <span className="text-[10px] !text-white/30 truncate">
                  {formatRelativeTime(doc.updatedAt)}
                </span>
              </div>
            </Link>

            {!isTemp && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[hsl(var(--sb-bg-hover))] rounded-md transition-all text-[hsl(var(--sb-text-faint))] hover:text-white focus:opacity-100">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 p-1.5 bg-[#050505]/95 backdrop-blur-xl border-white/10 text-white shadow-xl rounded-xl"
                >
                  <div className="px-2 py-1.5 text-[9px] font-bold text-white/40 uppercase tracking-widest">
                    Options
                  </div>
                  <DropdownMenuItem
                    onSelect={() =>
                      window.open(`/documents/${doc.id}`, "_blank")
                    }
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-white/60" />
                    <span className="text-xs font-medium">Open in new tab</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10">
                    <Copy className="h-3.5 w-3.5 text-white/60" />
                    <span className="text-xs font-medium">Duplicate</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10">
                    <Edit2 className="h-3.5 w-3.5 text-white/60" />
                    <span className="text-xs font-medium">Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-white/10" />
                  <DropdownMenuItem
                    onSelect={() => deleteDocument(doc.id)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer focus:bg-red-500/10 focus:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Delete document</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        );
      })}
    </ul>
  );
}
