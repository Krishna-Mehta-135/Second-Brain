"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Document } from "@repo/types";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion } from "framer-motion";
import { useDocuments } from "@/lib/documents/useDocuments";
import {
  Skeleton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
  Plus,
  GripVertical,
  Star,
  FolderPlus,
} from "lucide-react";
import { useStarredDocs } from "@/lib/documents/useStarredDocs";
import { useWorkspace } from "@/lib/workspaces/WorkspaceProvider";
import {
  ROOT_LIST_KEY,
  orderDocumentsForSidebar,
} from "@/lib/documents/sidebarOrderStorage";
import { useSidebarObsidianDrag } from "@/lib/documents/useSidebarObsidianDrag";

const MENU_SURFACE =
  "w-52 p-1.5 bg-[#050505]/95 backdrop-blur-xl border-white/10 text-white shadow-xl rounded-xl";

/** Main document ⋮ menu — hide scrollbar (Radix applies overflow-y-auto on content). */
const DOC_MENU_SURFACE = `${MENU_SURFACE} sb-doc-dropdown-scroll`;

const SUBMENU_SCROLL_HIDE =
  "sb-move-to-folder-sub max-h-72 overflow-y-auto overflow-x-hidden min-w-[220px] overscroll-contain";

const ROW_LAYOUT = {
  layout: true as const,
  transition: { type: "spring" as const, stiffness: 520, damping: 34 },
};

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

function collectFolderPaths(docs: Document[]): string[] {
  const set = new Set<string>([""]);
  for (const d of docs) {
    const fp = (d.folderPath ?? "").trim();
    if (!fp) continue;
    const parts = fp
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      set.add(parts.slice(0, i + 1).join("/"));
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function folderLabel(path: string) {
  return path === "" ? "Workspace root" : path;
}

function untitledSubfolderUnder(doc: Document): string {
  const fp = (doc.folderPath ?? "").trim();
  return fp ? `${fp}/Untitled` : "Untitled";
}

function MoveDocToFolderSubmenu({
  doc,
  folderPathOptions,
  onMove,
  onCreateUntitledSubfolderIn,
  onCreateNewFolder,
}: {
  doc: Document;
  folderPathOptions: string[];
  onMove: (path: string) => void;
  onCreateUntitledSubfolderIn: (parentPath: string) => void;
  onCreateNewFolder: () => void;
}) {
  const [draft, setDraft] = useState(() => (doc.folderPath ?? "").trim());

  useEffect(() => {
    setDraft((doc.folderPath ?? "").trim());
  }, [doc.id, doc.folderPath]);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10 text-xs data-[state=open]:bg-white/10">
        <FolderInput className="h-3.5 w-3.5 text-white/60" />
        <span className="font-medium">Move to folder</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        sideOffset={6}
        className={`${MENU_SURFACE} ${SUBMENU_SCROLL_HIDE}`}
      >
        <DropdownMenuItem
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10 text-xs"
          onSelect={() => onCreateNewFolder()}
        >
          <Plus
            size={12}
            className="text-[hsl(var(--sb-accent))]/90 shrink-0"
          />
          <span className="truncate font-medium">Create new folder…</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1 bg-white/10" />
        {folderPathOptions.map((fp) => (
          <DropdownMenuItem
            key={fp || "__root__"}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10 text-xs"
            onSelect={() => onMove(fp)}
          >
            <Folder
              size={12}
              className="text-[hsl(var(--sb-accent))]/80 shrink-0"
            />
            <span className="truncate">{folderLabel(fp)}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1 bg-white/10" />
        <div className="px-2 py-1 text-[9px] font-bold text-white/40 uppercase tracking-widest">
          Create Untitled subfolder under
        </div>
        {folderPathOptions.map((fp) => (
          <DropdownMenuItem
            key={`newsub-${fp || "__root__"}`}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10 text-xs"
            onSelect={() => onCreateUntitledSubfolderIn(fp)}
          >
            <Plus
              size={12}
              className="text-[hsl(var(--sb-accent))]/80 shrink-0"
            />
            <span className="truncate">{folderLabel(fp)}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1 bg-white/10" />
        <DropdownMenuItem
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10 text-xs"
          onSelect={() => onMove(untitledSubfolderUnder(doc))}
        >
          <Folder
            size={12}
            className="text-[hsl(var(--sb-accent))]/80 shrink-0"
          />
          <span className="truncate">
            New Untitled subfolder (under this note&apos;s folder)
          </span>
        </DropdownMenuItem>
        {(doc.folderPath ?? "").trim() ? (
          <DropdownMenuItem
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10 text-xs"
            onSelect={() => onMove("Untitled")}
          >
            <Folder size={12} className="text-white/50 shrink-0" />
            <span className="truncate">
              New Untitled subfolder at workspace root
            </span>
          </DropdownMenuItem>
        ) : null}
        <div
          className="border-t border-white/10 p-2 space-y-2 mt-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">
            New folder path
          </p>
          <p className="text-[10px] text-white/40 leading-snug">
            Folders exist when at least one note uses that path. Type a new path
            (use / between segments) and apply.
          </p>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-full rounded-md bg-black/50 border border-white/12 px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[hsl(var(--sb-accent))]/50"
            placeholder="e.g. Projects / Ideas"
          />
          <button
            type="button"
            className="w-full rounded-md bg-[hsl(var(--sb-accent))]/20 text-[hsl(var(--sb-accent))] text-xs py-1.5 font-medium hover:bg-[hsl(var(--sb-accent))]/30 transition-colors"
            onClick={() => onMove(draft.trim())}
          >
            Move to this path
          </button>
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function insertionRail(key: string) {
  return (
    <motion.li
      key={key}
      aria-hidden="true"
      role="presentation"
      {...ROW_LAYOUT}
      className="list-none mx-2 my-px h-[2px] shrink-0 rounded-full bg-[hsl(var(--sb-accent))] shadow-[0_0_14px_rgb(99_102_241/0.65)]"
    />
  );
}

function FolderTreeBranch({
  segments,
  node,
  renderOrderedListInFolder,
  onNewNoteInFolder,
  onNewSubfolder,
  nestHoverPath,
}: {
  segments: string[];
  node: TreeNode;
  renderOrderedListInFolder: (
    folderListKey: string,
    docs: Document[],
  ) => ReactNode;
  onNewNoteInFolder: (folderPath: string) => void;
  onNewSubfolder: (parentPath: string) => void;
  nestHoverPath: string | undefined;
}) {
  const label = segments[segments.length - 1] ?? "";
  const pathKey = segments.join("/");
  const [open, setOpen] = useState(segments.length <= 2);
  const nestTarget = nestHoverPath === pathKey;

  const childFolders = [...node.children.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <div
      className={
        segments.length ? "ml-1.5 border-l border-white/[0.06] pl-2" : ""
      }
    >
      <div
        data-sb-folder-header
        data-sb-folder-path={pathKey}
        className={`flex items-center gap-0.5 rounded-md group/frow pr-0.5 transition-all duration-150 ${
          nestTarget
            ? "bg-[hsl(var(--sb-accent))]/18 ring-1 ring-[hsl(var(--sb-accent))]/55 shadow-[inset_0_0_0_1px_hsl(var(--sb-accent)/0.2)]"
            : "hover:bg-[hsl(var(--sb-bg-hover))]/50"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 min-w-0 items-center gap-1.5 text-[10px] px-2 py-1 rounded text-[hsl(var(--sb-text-muted))] hover:text-white text-left transition-colors"
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 p-1 rounded opacity-0 group-hover/frow:opacity-100 text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-all"
              aria-label="Folder actions"
              onClick={(e) => e.stopPropagation()}
            >
              <Plus size={12} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={MENU_SURFACE}>
            <DropdownMenuItem
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10 text-xs"
              onSelect={() => onNewNoteInFolder(pathKey)}
            >
              <FileText size={12} className="text-white/55" />
              New note in folder
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10 text-xs"
              onSelect={() => onNewSubfolder(pathKey)}
            >
              <Folder size={12} className="text-[hsl(var(--sb-accent))]/90" />
              New subfolder (Untitled)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          <LayoutGroup id={`sb-tree-${pathKey.replace(/\//g, "_")}`}>
            <ul
              data-sb-doc-list={pathKey}
              className="space-y-0.5 list-none p-0 m-0"
            >
              {renderOrderedListInFolder(pathKey, node.docs)}
            </ul>
          </LayoutGroup>
          {childFolders.map(([nm, ch]) => (
            <FolderTreeBranch
              key={`${pathKey}/${nm}`}
              segments={[...segments, nm]}
              node={ch}
              renderOrderedListInFolder={renderOrderedListInFolder}
              onNewNoteInFolder={onNewNoteInFolder}
              onNewSubfolder={onNewSubfolder}
              nestHoverPath={nestHoverPath}
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
  const {
    documents,
    isLoading,
    deleteDocument,
    updateDocument,
    createDocument,
    patchDocumentInCache,
  } = useDocuments();
  const { activeWorkspaceId } = useWorkspace();
  const { toggleStar, isStarred } = useStarredDocs();
  const pathname = usePathname();
  const router = useRouter();

  const filteredRef = useRef<Document[]>([]);

  const filteredDocuments = useMemo(
    () =>
      documents.filter((doc) => {
        const title = doc.title ?? "";
        const folder = doc.folderPath ?? "";
        const searchLower = search.toLowerCase();
        const matchesText =
          !search ||
          fuzzyMatch(title, search) ||
          title.toLowerCase().includes(searchLower) ||
          fuzzyMatch(folder, search) ||
          folder.toLowerCase().includes(searchLower) ||
          (Array.isArray(doc.tags) &&
            doc.tags.some((t) => {
              if (!t) return false;
              const s = (typeof t === "string" ? t : String(t)).toLowerCase();
              return fuzzyMatch(s, search) || s.includes(searchLower);
            }));
        const matchesTag =
          !tagFilter ||
          (doc.tags ?? []).some(
            (t) => t && t.toLowerCase() === tagFilter.toLowerCase(),
          );
        return matchesText && matchesTag;
      }),
    [documents, search, tagFilter],
  );

  filteredRef.current = filteredDocuments;

  const { session, hit, beginGripDrag } = useSidebarObsidianDrag({
    workspaceId: activeWorkspaceId,
    getDocuments: () => filteredRef.current,
    updateDocument,
    patchDocumentInCache,
  });

  const nestHoverPath = hit?.type === "nest" ? hit.folderPath : undefined;

  const wsId = activeWorkspaceId ?? null;

  const folderPathOptions = useMemo(
    () => collectFolderPaths(documents),
    [documents],
  );

  const newNoteInFolder = useCallback(
    async (folderPath: string) => {
      const d = await createDocument({ folderPath });
      if (d?.id) router.push(`/documents/${d.id}`);
    },
    [createDocument, router],
  );

  const newSubfolder = useCallback(
    async (parentPath: string) => {
      const sub = parentPath ? `${parentPath}/Untitled` : "Untitled";
      const d = await createDocument({ folderPath: sub });
      if (d?.id) router.push(`/documents/${d.id}`);
    },
    [createDocument, router],
  );

  const tree = useMemo(() => {
    const root: TreeNode = { docs: [], children: new Map() };
    for (const d of filteredDocuments) insertDoc(root, d);
    return root;
  }, [filteredDocuments]);

  /* --- One motion row -------------------------------------------------- */
  const renderDocRowMotion = useCallback(
    (doc: Document, listKey: string) => {
      const isActive = pathname === `/documents/${doc.id}`;
      const isTemp = doc.id.startsWith("temp-");
      const safeTitle = safeDocTitle(doc);
      const draggingHere = session?.docId === doc.id;

      return (
        <motion.li
          {...ROW_LAYOUT}
          layout="position"
          key={`${listKey}:${doc.id}`}
          data-sb-doc-row
          data-doc-id={doc.id}
          className={`group list-none rounded-md transition-colors duration-150 ${
            draggingHere
              ? "relative z-[2] opacity-55 ring-1 ring-[hsl(var(--sb-accent))]/60 bg-[hsl(var(--sb-bg-panel))]/90 backdrop-blur-[2px]"
              : ""
          }`}
        >
          <div className="flex w-full min-w-0 items-center gap-0.5">
            {!isTemp ? (
              <div
                role="button"
                tabIndex={-1}
                title="Drag to reorder — hover folder name to nest"
                aria-label="Drag to move note"
                style={{ touchAction: "none" }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  beginGripDrag(
                    e.pointerId,
                    doc.id,
                    listKey,
                    e.clientX,
                    e.clientY,
                  );
                }}
                className="shrink-0 min-w-[1.875rem] min-h-10 flex items-center justify-center rounded-md cursor-grab active:cursor-grabbing text-white/40 opacity-70 group-hover:opacity-100 hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-all select-none"
              >
                <GripVertical size={14} aria-hidden />
              </div>
            ) : (
              <span className="w-7 shrink-0" aria-hidden />
            )}
            <Link
              href={isTemp ? "#" : `/documents/${doc.id}`}
              draggable={false}
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
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[hsl(var(--sb-bg-hover))] rounded-md transition-all text-[hsl(var(--sb-text-faint))] hover:text-white focus:opacity-100 shrink-0">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={DOC_MENU_SURFACE}>
                  <div className="px-2 py-1.5 text-[9px] font-bold text-white/40 uppercase tracking-widest">
                    Document
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
                  <MoveDocToFolderSubmenu
                    key={`move-${doc.id}`}
                    doc={doc}
                    folderPathOptions={folderPathOptions}
                    onMove={(path) =>
                      void updateDocument(doc.id, { folderPath: path })
                    }
                    onCreateUntitledSubfolderIn={(parentPath) =>
                      void newSubfolder(parentPath)
                    }
                    onCreateNewFolder={() => {
                      const base = (doc.folderPath ?? "").trim();
                      const hint = base
                        ? `${base}/New folder`
                        : "Projects/Ideas";
                      const raw = window.prompt(
                        "Folder path (segments separated by /). A starter note will be created in that folder.",
                        hint,
                      );
                      const path = raw?.trim().replace(/^\/+|\/+$/g, "") ?? "";
                      if (!path) return;
                      void createDocument({ folderPath: path }).then((d) => {
                        if (d?.id) router.push(`/documents/${d.id}`);
                      });
                    }}
                  />
                  <DropdownMenuItem
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10 text-xs"
                    onSelect={() =>
                      void newSubfolder((doc.folderPath ?? "").trim())
                    }
                  >
                    <FolderPlus className="h-3.5 w-3.5 text-[hsl(var(--sb-accent))]/90" />
                    <span className="text-xs font-medium">
                      Create subfolder
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10 cursor-pointer focus:bg-white/10"
                    onSelect={() => toggleStar(doc.id)}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${isStarred(doc.id) ? "text-amber-400 fill-amber-400" : "text-white/60"}`}
                    />
                    <span className="text-xs font-medium">
                      {isStarred(doc.id) ? "Remove star" : "Star document"}
                    </span>
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
          </div>
        </motion.li>
      );
    },
    [
      pathname,
      session?.docId,
      beginGripDrag,
      toggleStar,
      isStarred,
      updateDocument,
      deleteDocument,
      folderPathOptions,
      newSubfolder,
      createDocument,
      router,
    ],
  );

  const renderOrderedListInFolder = useCallback(
    (listKey: string, docsAtLeaf: Document[]) => {
      const ordered = orderDocumentsForSidebar(wsId, listKey, docsAtLeaf);
      const reorderHit = hit?.type === "reorder" ? hit : null;
      const railForList = Boolean(session) && reorderHit?.listKey === listKey;
      const li = reorderHit?.listKey === listKey ? reorderHit.insertIndex : -1;

      const out: ReactNode[] = [];
      ordered.forEach((doc, idx) => {
        if (railForList && li === idx) {
          out.push(insertionRail(`rail-${listKey}-${idx}`));
        }
        out.push(renderDocRowMotion(doc, listKey));
      });
      if (railForList && li >= ordered.length) {
        out.push(insertionRail(`rail-${listKey}-end`));
      }
      return <>{out}</>;
    },
    [session, hit, wsId, renderDocRowMotion],
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

  const rootLeaf = filteredDocuments.filter(
    (d) => !(d.folderPath ?? "").trim(),
  );

  return (
    <div className="space-y-0.5 py-2 select-none">
      {tree.docs.length > 0 && (
        <LayoutGroup id="sb-root-docs">
          <ul
            data-sb-doc-list={ROOT_LIST_KEY}
            className="space-y-0.5 list-none p-0 m-0"
          >
            {renderOrderedListInFolder(ROOT_LIST_KEY, rootLeaf)}
          </ul>
        </LayoutGroup>
      )}
      {topFolders.map(([nm, ch]) => (
        <div key={nm} className="mb-2">
          <FolderTreeBranch
            segments={[nm]}
            node={ch}
            renderOrderedListInFolder={renderOrderedListInFolder}
            onNewNoteInFolder={newNoteInFolder}
            onNewSubfolder={newSubfolder}
            nestHoverPath={nestHoverPath}
          />
        </div>
      ))}
    </div>
  );
}
