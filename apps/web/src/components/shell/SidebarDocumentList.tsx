"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Document } from "@repo/types";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
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
  ChevronDown,
  ChevronRight,
  Folder,
  FolderInput,
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

interface TreeNode {
  docs: Document[];
  children: Map<string, TreeNode>;
}

function insertDoc(root: TreeNode, doc: Document) {
  const raw = doc.folderPath?.trim() ?? "";
  const parts = raw
    ? raw
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (!parts.length) {
    root.docs.push(doc);
    return;
  }

  let cur = root;
  for (const segment of parts) {
    if (!cur.children.has(segment)) {
      cur.children.set(segment, { docs: [], children: new Map() });
    }
    cur = cur.children.get(segment)!;
  }
  cur.docs.push(doc);
}

function safeDocTitle(doc: Document) {
  const t = doc.title?.trim() ?? "";
  if (!t || t.toLowerCase() === "undefined") return "Untitled";
  return t;
}

function FolderTreeBranch({
  segments,
  node,
  renderDocRow,
}: {
  segments: string[];
  node: TreeNode;
  renderDocRow: (doc: Document, opts?: { nested?: boolean }) => ReactNode;
}) {
  const label = segments[segments.length - 1] ?? "";
  const pathKey = segments.join("/");
  const [open, setOpen] = useState(segments.length <= 2);

  const childFolders = [...node.children.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div
      className={
        segments.length ? "ml-1.5 border-l border-white/[0.06] pl-2" : ""
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded text-[hsl(var(--sb-text-muted))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] w-full text-left transition-colors"
      >
        {open ? (
          <ChevronDown size={11} className="shrink-0 opacity-70" />
        ) : (
          <ChevronRight size={11} className="shrink-0 opacity-70" />
        )}
        <Folder
          size={12}
          className="shrink-0 text-[hsl(var(--sb-accent))]/80"
        />
        <span className="truncate font-medium">{label}</span>
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {node.docs.map((d) => renderDocRow(d, { nested: true }))}
          {childFolders.map(([nm, ch]) => (
            <FolderTreeBranch
              key={`${pathKey}/${nm}`}
              segments={[...segments, nm]}
              node={ch}
              renderDocRow={renderDocRow}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarDocumentList({
  search,
  tagFilter,
}: {
  search: string;
  tagFilter?: string | null;
}) {
  const { documents, isLoading, deleteDocument, updateDocument } =
    useDocuments();
  const pathname = usePathname();

  const filteredDocuments = documents.filter((doc) => {
    const title = doc.title ?? "";
    const folder = doc.folderPath ?? "";
    const matchesText =
      fuzzyMatch(title, search) ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      fuzzyMatch(folder, search) ||
      folder.toLowerCase().includes(search.toLowerCase());
    const matchesTag =
      !tagFilter ||
      (doc.tags ?? []).some(
        (t) => t && t.toLowerCase() === tagFilter.toLowerCase(),
      );
    return matchesText && matchesTag;
  });

  const tree = useMemo(() => {
    const root: TreeNode = { docs: [], children: new Map() };
    for (const d of filteredDocuments) insertDoc(root, d);
    return root;
  }, [filteredDocuments]);

  const renderDocRow = (
    doc: Document,
    { nested = false }: { nested?: boolean } = {},
  ) => {
    const isActive = pathname === `/documents/${doc.id}`;
    const isTemp = doc.id.startsWith("temp-");
    const safeTitle = safeDocTitle(doc);

    return (
      <li
        key={doc.id}
        className={`group flex items-center gap-1 ${nested ? "" : ""}`}
      >
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
            <span className="truncate">{safeTitle}</span>
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
              className="w-52 p-1.5 bg-[#050505]/95 backdrop-blur-xl border-white/10 text-white shadow-xl rounded-xl"
            >
              <div className="px-2 py-1.5 text-[9px] font-bold text-white/40 uppercase tracking-widest">
                Document
              </div>
              <DropdownMenuItem
                onSelect={() => window.open(`/documents/${doc.id}`, "_blank")}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10"
              >
                <ExternalLink className="h-3.5 w-3.5 text-white/60" />
                <span className="text-xs font-medium">Open in new tab</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10"
                onSelect={() => {
                  navigator.clipboard.writeText(
                    `${typeof window !== "undefined" ? window.location.origin : ""}/documents/${doc.id}`,
                  );
                }}
              >
                <Copy className="h-3.5 w-3.5 text-white/60" />
                <span className="text-xs font-medium">Copy link</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10"
                onSelect={() => {
                  const nt = window.prompt("Rename document", safeTitle);
                  if (nt && nt.trim())
                    void updateDocument(doc.id, { title: nt.trim() });
                }}
              >
                <Edit2 className="h-3.5 w-3.5 text-white/60" />
                <span className="text-xs font-medium">Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10"
                onSelect={() => {
                  const nf = window.prompt(
                    "Folder path (segments with /)",
                    doc.folderPath ?? "",
                  );
                  if (nf !== null)
                    void updateDocument(doc.id, { folderPath: nf.trim() });
                }}
              >
                <FolderInput className="h-3.5 w-3.5 text-white/60" />
                <span className="text-xs font-medium">Move to folder…</span>
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
  };

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

  if (filteredDocuments.length === 0 && (search || tagFilter)) {
    return (
      <p className="text-xs text-[hsl(var(--sb-text-faint))] px-2 py-4 text-center">
        No matches
        {search ? ` for "${search}"` : ""}
        {tagFilter ? ` in #${tagFilter}` : ""}
      </p>
    );
  }

  const topFolders = [...tree.children.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div className="space-y-0.5 py-2">
      {tree.docs.length > 0 && (
        <ul className="space-y-0.5">
          {tree.docs.map((doc) => renderDocRow(doc))}
        </ul>
      )}
      {topFolders.map(([nm, ch]) => (
        <div key={nm} className="mb-2">
          <FolderTreeBranch
            segments={[nm]}
            node={ch}
            renderDocRow={renderDocRow}
          />
        </div>
      ))}
    </div>
  );
}
