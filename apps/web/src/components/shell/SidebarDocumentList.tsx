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
} from "@repo/ui";
import { formatRelativeTime } from "@/lib/utils/time";
import { FileText, MoreVertical, Trash2 } from "lucide-react";

export function SidebarDocumentList({ search }: { search: string }) {
  const { documents, isLoading, deleteDocument } = useDocuments();
  const pathname = usePathname();

  const filteredDocuments = documents.filter((doc) =>
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
      <p className="text-xs text-muted-foreground px-2 py-4 text-center">
        No documents yet
      </p>
    );
  }

  if (filteredDocuments.length === 0 && search) {
    return (
      <p className="text-xs text-muted-foreground px-2 py-4 text-center">
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
                    ? "bg-brand/10 text-brand font-medium"
                    : "text-foreground/80 hover:bg-surface-hover hover:text-foreground"
                }
                ${isTemp ? "opacity-50 cursor-not-allowed" : ""}
              `}
              onClick={(e) => isTemp && e.preventDefault()}
            >
              <FileText
                className={`h-4 w-4 shrink-0 ${isActive ? "text-brand" : "text-muted-foreground group-hover:text-foreground"}`}
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="truncate">{doc.title || "Untitled"}</span>
                <span className="text-[10px] text-muted-foreground truncate">
                  {formatRelativeTime(doc.updatedAt)}
                </span>
              </div>
            </Link>

            {!isTemp && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-hover rounded-md transition-all text-muted-foreground hover:text-foreground focus:opacity-100">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    onSelect={() => deleteDocument(doc.id)}
                    className="text-red-600 focus:text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
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
