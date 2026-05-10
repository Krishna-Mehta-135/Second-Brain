"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  useCallback,
  useMemo,
} from "react";
import {
  Search,
  Plus,
  Hash,
  ChevronRight,
  ChevronDown,
  Settings,
  Star,
  StarOff,
  Clock,
  Network,
  MoreHorizontal,
  Command as CmdIcon,
  ChevronLeft,
  LogOut,
  Archive,
  Download,
  Trash2,
  Copy,
  Check,
  FileText,
  Users,
  Globe,
  Lock,
  Folder,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { logoutAction } from "@/lib/auth/actions";
import { MiniPhysicsGraph } from "./MiniPhysicsGraph";
import { SidebarDocumentList } from "./SidebarDocumentList";
import { BacklinksPanel } from "@/components/editor/BacklinksPanel";
import { useParams } from "next/navigation";
import { useStarredDocs } from "@/lib/documents/useStarredDocs";
import { useRecentDocs } from "@/lib/documents/useRecentDocs";
import { useDocuments } from "@/lib/documents/useDocuments";
import Link from "next/link";

import { LogoMark } from "@/components/ui/LogoMark";
import { useWorkspace } from "@/lib/workspaces/WorkspaceProvider";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";

function normalizedDocTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.toLowerCase() === "undefined") return null;
  return s;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [currentDocTitle, setCurrentDocTitle] = useState<string | null>(null);
  /** Command palette only — sidebar note list is not filtered by this */
  const [cmdPaletteSearch, setCmdPaletteSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [starredOpen, setStarredOpen] = useState(false);
  const [sidebarTagFilter, setSidebarTagFilter] = useState<string | null>(null);
  const [pendingJoinCount, setPendingJoinCount] = useState(0);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  // Close sidebar on mobile when pathname changes (switching docs, etc.)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  const handleCreateNew = useCallback(async () => {
    if (isCreatingNew) return;
    setIsCreatingNew(true);
    try {
      router.push("/documents/new");
    } finally {
      // We don't set it back to false immediately to prevent rapid double-clicks
      // during the navigation phase. The new page will handle its own state.
      setTimeout(() => setIsCreatingNew(false), 2000);
    }
  }, [isCreatingNew, router]);

  /** Parent layout often omits nested `docId` from useParams — derive from URL */
  const currentDocId = useMemo(() => {
    const fromParams = params?.docId as string | undefined;
    if (fromParams && fromParams !== "new") return fromParams;
    const m = pathname?.match(/^\/documents\/([^/]+)$/);
    const id = m?.[1];
    if (!id || id === "new") return undefined;
    return id;
  }, [params, pathname]);

  const {
    memberships,
    activeWorkspaceId,
    setActiveWorkspaceId,
    activeWorkspace,
  } = useWorkspace();

  const { starredIds, toggleStar, isStarred } = useStarredDocs();
  const { recentIds } = useRecentDocs();
  const { documents, createDocument } = useDocuments();

  const isOwnerOfActive =
    memberships.find(
      (m) => m.workspace.id === activeWorkspaceId && m.role === "owner",
    ) != null;

  // Resolve IDs to document objects
  const recentDocs = recentIds
    .map((id) => documents.find((d) => d.id === id))
    .filter(Boolean) as (typeof documents)[0][];

  const starredDocs = [...starredIds]
    .map((id) => documents.find((d) => d.id === id))
    .filter(Boolean) as (typeof documents)[0][];

  const docTagsList = useMemo(() => {
    const s = new Set<string>();
    for (const d of documents) {
      for (const t of d.tags ?? []) {
        const x = typeof t === "string" ? t.trim() : "";
        if (x) s.add(x);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [documents]);

  useEffect(() => {
    setMounted(true);
    setIsMac(navigator.userAgent.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  // Synchronously resolve title if possible to avoid flickering to null/Untitled
  const resolvedTitle = useMemo(() => {
    if (!currentDocId) return null;
    const d = documents.find((x) => x.id === currentDocId);
    return (
      normalizedDocTitle(d?.title) ??
      (currentDocId === "new" ? "New Note" : null)
    );
  }, [currentDocId, documents]);

  useEffect(() => {
    if (resolvedTitle) {
      setCurrentDocTitle(resolvedTitle);
    }
  }, [resolvedTitle]);

  // Listen for live title updates dispatched from EditorTitle
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ docId: string; title: string }>;
      if (!ev?.detail) return;
      if (ev.detail.docId === currentDocId) {
        const t = normalizedDocTitle(ev.detail.title);
        setCurrentDocTitle(t ?? "Untitled");
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("doc:title:changed", handler as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "doc:title:changed",
          handler as EventListener,
        );
      }
    };
  }, [currentDocId]);

  useEffect(() => {
    if (!activeWorkspaceId || !isOwnerOfActive) {
      setPendingJoinCount(0);
      return;
    }
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch(
          `/api/workspaces/${activeWorkspaceId}/join-requests`,
          { credentials: "include" },
        );
        const j = await r.json().catch(() => ({}));
        const list = Array.isArray(j?.data) ? j.data : [];
        if (!cancelled) setPendingJoinCount(list.length);
      } catch {
        if (!cancelled) setPendingJoinCount(0);
      }
    }
    void poll();
    const id = setInterval(poll, 45000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeWorkspaceId, isOwnerOfActive]);

  // Close/open panels on resize to avoid panels overlapping the document on narrow widths
  useEffect(() => {
    function onResize() {
      const small = window.innerWidth < 768;
      if (small) {
        setSidebarOpen(false);
        setRightPanelOpen(false);
      } else {
        setSidebarOpen(true);
        setRightPanelOpen(true);
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("resize", onResize);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", onResize);
      }
    };
  }, []);

  // Clear displayed title when switching workspaces so stale titles don't persist
  useEffect(() => {
    setCurrentDocTitle(null);
  }, [activeWorkspaceId]);

  // Toggle cmd palette with meta+k
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCmdPaletteOpen(false);
        setCmdPaletteSearch("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }, []);

  const exportMarkdown = useCallback(() => {
    if (!currentDocId) return;
    const docMeta = documents.find((d) => d.id === currentDocId);
    const baseName =
      normalizedDocTitle(docMeta?.title) ??
      normalizedDocTitle(currentDocTitle) ??
      "document";

    let settled = false;
    const timeoutId = window.setTimeout(() => finalize(""), 8500);

    function finalize(md: string) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      window.removeEventListener(
        "knowdex-export-markdown-result",
        onResult as EventListener,
      );
      const body = `# ${baseName}\n\n${md}`.trimEnd() + "\n";
      const safeFile = `${baseName.replace(/[/\\?%*:|"<>]/g, "-")}.md`;
      const element = document.createElement("a");
      element.href = `data:text/markdown;charset=utf-8,${encodeURIComponent(body)}`;
      element.download = safeFile;
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }

    function onResult(e: Event) {
      const ev = e as CustomEvent<{ markdown?: string; docId?: string }>;
      if (ev.detail?.docId && ev.detail.docId !== currentDocId) return;
      finalize(ev.detail?.markdown ?? "");
    }

    window.addEventListener(
      "knowdex-export-markdown-result",
      onResult as EventListener,
    );

    window.dispatchEvent(
      new CustomEvent("knowdex-export-markdown-request", {
        detail: { docId: currentDocId },
      }),
    );
  }, [currentDocId, documents, currentDocTitle]);

  const displayNameRaw =
    mounted && auth.status === "authenticated"
      ? (auth.session.user.name ?? "").trim()
      : "";
  const userInitials = displayNameRaw
    ? displayNameRaw
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
  const userName = displayNameRaw || "Guest";

  return (
    <div className="flex h-screen w-full bg-[hsl(var(--sb-bg))] text-[hsl(var(--sb-text))] overflow-hidden font-sans">
      {/* Left Sidebar */}
      {/* Mobile overlay backdrop for left sidebar — only show on mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ pointerEvents: sidebarOpen ? "auto" : "none" }}
        />
      )}
      <div
        className={`flex flex-col border-r border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] transition-all duration-300 ease-in-out max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 ${sidebarOpen ? "w-[85vw] max-w-[320px] md:w-64" : "w-0 opacity-0 overflow-hidden max-md:-translate-x-full"}`}
      >
        <div className="flex items-center border-b border-[hsl(var(--sb-border))] shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="h-12 flex-1 flex items-center justify-between px-4 hover:bg-[hsl(var(--sb-bg-hover))] cursor-pointer transition-colors group min-w-0">
                <div className="flex items-center gap-2 font-medium text-sm min-w-0">
                  <LogoMark size={20} />
                  <span className="truncate">
                    {activeWorkspace?.name ?? `${userName}'s Brain`}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className="text-[hsl(var(--sb-text-faint))] group-hover:text-white transition-colors shrink-0"
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-64 max-h-[min(70vh,420px)] overflow-y-auto p-2 bg-[#050505]/95 backdrop-blur-xl border-white/10 text-white shadow-2xl rounded-xl ml-2 mt-1"
            >
              <div className="px-2 py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Switch workspace
              </div>
              {memberships.length === 0 ? (
                <div className="px-2 py-2 text-xs text-white/45">
                  No workspaces loaded.
                </div>
              ) : (
                memberships.map((m) => (
                  <DropdownMenuItem
                    key={m.workspace.id}
                    onClick={() => setActiveWorkspaceId(m.workspace.id)}
                    className={`flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10 ${
                      m.workspace.id === activeWorkspaceId
                        ? "bg-[hsl(var(--sb-accent))]/12"
                        : ""
                    }`}
                  >
                    {m.workspace.isPublic ? (
                      <Globe
                        size={16}
                        className="text-[hsl(var(--sb-accent))] shrink-0 mt-0.5"
                      />
                    ) : (
                      <Lock
                        size={16}
                        className="text-white/45 shrink-0 mt-0.5"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {m.workspace.name}
                      </div>
                      <div className="text-[10px] text-white/40 truncate font-mono">
                        {m.workspace.slug}
                      </div>
                      <div className="text-[10px] text-white/35 mt-0.5 leading-snug">
                        {m.workspace.isPublic
                          ? "Public — join with slug (Workspace settings to change)"
                          : "Private — join requests need owner approval"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="text-[10px] px-2 py-0.5 rounded-md font-semibold text-white/90 bg-[hsl(var(--sb-bg))] border border-[hsl(var(--sb-border))]">
                        {m.workspace.isPublic ? "Public" : "Private"}
                      </div>
                      {m.workspace.id === activeWorkspaceId ? (
                        <Check
                          size={14}
                          className="text-[hsl(var(--sb-accent))] shrink-0 mt-0.5"
                        />
                      ) : null}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator className="my-1.5 bg-white/10" />
              <DropdownMenuItem
                onClick={() => {
                  void (async () => {
                    const d = await createDocument({ folderPath: "Untitled" });
                    if (d?.id) router.push(`/documents/${d.id}`);
                  })();
                }}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10"
              >
                <Folder size={15} className="text-[hsl(var(--sb-accent))]/90" />
                <span className="font-medium text-sm">
                  Create Untitled subfolder
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/workspace/join")}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10"
              >
                <Users size={15} className="text-[hsl(var(--sb-accent))]" />
                <span className="font-medium text-sm">Join workspace</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings/workspace")}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10"
              >
                <Settings size={15} className="text-white/60" />
                <span className="font-medium text-sm flex-1 flex items-center justify-between gap-2">
                  Workspace settings
                  {pendingJoinCount > 0 ? (
                    <span className="text-[10px] font-bold bg-[hsl(var(--sb-accent))] text-white px-1.5 py-0.5 rounded-md">
                      {pendingJoinCount}
                    </span>
                  ) : null}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleShare}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10"
              >
                <Network size={15} className="text-white/60" />
                <span className="font-medium text-sm">Share this page</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5 bg-white/10" />
              <DropdownMenuItem
                onClick={() => router.push("/settings/workspace")}
                className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10"
              >
                <Plus size={15} className="text-white/60" />
                <span className="font-medium text-sm">Create workspace…</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={handleCreateNew}
            disabled={isCreatingNew}
            className="h-12 w-12 flex items-center justify-center border-l border-[hsl(var(--sb-border))] hover:bg-[hsl(var(--sb-bg-hover))] text-[hsl(var(--sb-text-faint))] hover:text-white transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            title="New Note (⌘N)"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="p-3 shrink-0">
          <button
            onClick={() => setCmdPaletteOpen(true)}
            className="w-full flex items-center justify-between bg-[hsl(var(--sb-bg))] border border-[hsl(var(--sb-border))] rounded-md px-3 py-1.5 text-sm text-[hsl(var(--sb-text-muted))] hover:border-[hsl(var(--sb-accent))] hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search size={14} /> Search...
            </span>
            <span className="flex items-center gap-0.5 text-[10px] bg-[hsl(var(--sb-bg-hover))] px-1.5 py-0.5 rounded border border-[hsl(var(--sb-border))]">
              {isMac ? (
                <>
                  <CmdIcon size={10} /> K
                </>
              ) : (
                "Ctrl K"
              )}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4 sb-sidebar-no-scrollbar">
          <div className="space-y-0.5">
            {/* Recent */}
            <SidebarItem
              icon={<Clock size={14} />}
              label="Recent"
              expandable
              expanded={recentOpen}
              onToggle={() => setRecentOpen((p) => !p)}
            />
            {recentOpen && (
              <div className="ml-4 space-y-0.5">
                {recentDocs.length === 0 ? (
                  <p className="text-[11px] text-[hsl(var(--sb-text-faint))] px-2 py-1 italic">
                    No recent docs
                  </p>
                ) : (
                  recentDocs.slice(0, 5).map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/documents/${doc.id}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[hsl(var(--sb-text-muted))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors"
                    >
                      <FileText
                        size={11}
                        className="text-[hsl(var(--sb-text-faint))] shrink-0"
                      />
                      <span className="truncate">
                        {normalizedDocTitle(doc.title) ?? "Untitled"}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Starred */}
            <SidebarItem
              icon={<Star size={14} />}
              label="Starred"
              expandable
              expanded={starredOpen}
              onToggle={() => setStarredOpen((p) => !p)}
            />
            {starredOpen && (
              <div className="ml-4 space-y-0.5">
                {starredDocs.length === 0 ? (
                  <p className="text-[11px] text-[hsl(var(--sb-text-faint))] px-2 py-1 italic">
                    No starred docs
                  </p>
                ) : (
                  starredDocs.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/documents/${doc.id}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[hsl(var(--sb-text-muted))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors"
                    >
                      <Star
                        size={11}
                        className="text-[hsl(var(--sb-accent))] shrink-0"
                      />
                      <span className="truncate">
                        {normalizedDocTitle(doc.title) ?? "Untitled"}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}

            <SidebarItem
              icon={<Network size={14} />}
              label="Graph View"
              onClick={() => {
                router.push("/graph");
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
            />
          </div>

          <div>
            <div className="px-3 py-1 text-xs font-semibold tracking-wider text-[hsl(var(--sb-text-faint))] uppercase flex items-center justify-between group">
              WORKSPACE
              <button
                onClick={handleCreateNew}
                disabled={isCreatingNew}
                className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity cursor-pointer disabled:opacity-30"
              >
                <Plus size={12} />
              </button>
            </div>
            <div className="space-y-0.5 mt-1">
              <SidebarDocumentList search="" tagFilter={sidebarTagFilter} />
            </div>
          </div>

          <div>
            <div className="px-3 py-1 text-xs font-semibold tracking-wider text-[hsl(var(--sb-text-faint))] uppercase">
              TAGS
            </div>
            <div className="flex flex-wrap gap-1.5 px-3 mt-1">
              {sidebarTagFilter ? (
                <button
                  type="button"
                  onClick={() => setSidebarTagFilter(null)}
                  className="text-[10px] text-[hsl(var(--sb-text-faint))] hover:text-white px-1 underline-offset-2 hover:underline"
                >
                  Clear tag filter
                </button>
              ) : null}
              {docTagsList.length === 0 ? (
                <p className="text-[11px] text-[hsl(var(--sb-text-faint))] italic px-0.5">
                  Tags from your notes appear here
                </p>
              ) : (
                docTagsList.map((t) => (
                  <TagBadge
                    key={t}
                    label={t}
                    active={sidebarTagFilter === t}
                    onClick={() =>
                      setSidebarTagFilter((v) => (v === t ? null : t))
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* User profile bottom */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="h-14 border-t border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] flex items-center px-4 gap-3 hover:bg-[hsl(var(--sb-bg-hover))] cursor-pointer transition-colors shrink-0">
              <div className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-black border border-white/10 text-[10px] font-bold text-white shadow-sm shrink-0">
                {userInitials}
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[hsl(var(--sb-bg-panel))]" />
              </div>
              <div className="text-sm font-medium flex-1 truncate">
                {userName}
              </div>
              <ChevronDown
                size={14}
                className="text-[hsl(var(--sb-text-faint))] hover:text-white transition-colors group-hover:text-white"
              />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-56 p-2 bg-[#050505]/95 backdrop-blur-xl border-white/10 text-white shadow-2xl rounded-xl mb-2"
          >
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10"
            >
              <Settings size={15} className="text-white/60" />
              <span className="font-medium text-sm">Account Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 bg-white/10" />
            <DropdownMenuItem
              onClick={() =>
                startTransition(async () => {
                  await logoutAction();
                })
              }
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-400 cursor-pointer disabled:opacity-50 focus:bg-red-500/10 focus:text-red-400"
              disabled={isPending}
            >
              <LogOut size={15} />
              <span className="font-medium text-sm">
                {isPending ? "Logging out..." : "Log out"}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Topbar */}
        <header className="h-12 md:h-12 max-md:h-16 border-b border-[hsl(var(--sb-border))] flex items-center justify-between px-2 sm:px-4 shrink-0 bg-[hsl(var(--sb-bg))/0.8] backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors shrink-0"
            >
              {sidebarOpen ? (
                <ChevronLeft size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </button>
            <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-[hsl(var(--sb-text-muted))] min-w-0">
              <span className="hidden xs:inline shrink-0">Workspace</span>
              <ChevronRight
                size={14}
                className="text-[hsl(var(--sb-text-faint))] hidden xs:inline shrink-0"
              />
              <span className="text-white font-medium truncate max-w-[120px] sm:max-w-[200px] text-sm md:text-base">
                {resolvedTitle || "Untitled"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="hidden xs:flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-[hsl(var(--sb-text-faint))] mr-0.5 sm:mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Online
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 rounded bg-[hsl(var(--sb-bg-panel))] border border-[hsl(var(--sb-border))] hover:border-[hsl(var(--sb-accent))] transition-colors min-h-[32px] md:min-h-0"
            >
              {shareCopied ? (
                <Check size={18} className="text-green-400 md:scale-125" />
              ) : (
                <Copy size={16} />
              )}
              <span className="hidden sm:inline">
                {shareCopied ? "Copied!" : "Share"}
              </span>
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 768) {
                  // On small screens, open dedicated graph page instead of right panel
                  router.push("/graph");
                  setSidebarOpen(false);
                  return;
                }
                setRightPanelOpen(!rightPanelOpen);
              }}
              className={`p-2 rounded transition-colors flex ${rightPanelOpen ? "text-white bg-[hsl(var(--sb-bg-hover))]" : "text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))]"}`}
            >
              <Network size={18} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors">
                  <MoreHorizontal size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 sm:w-64 p-2 bg-[#050505]/95 backdrop-blur-xl border-white/10 text-white shadow-2xl rounded-xl"
              >
                <div className="px-2 py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  DOCUMENT
                </div>
                {currentDocId && (
                  <DropdownMenuItem
                    onClick={() => {
                      toggleStar(currentDocId);
                      if (window.innerWidth < 768) setSidebarOpen(false);
                    }}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10"
                  >
                    {isStarred(currentDocId) ? (
                      <StarOff
                        size={15}
                        className="text-[hsl(var(--sb-accent))]"
                      />
                    ) : (
                      <Star size={15} className="text-white/60" />
                    )}
                    <span className="font-medium text-sm">
                      {isStarred(currentDocId)
                        ? "Unstar Document"
                        : "Star Document"}
                    </span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    alert("Archive feature coming soon!");
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10"
                >
                  <Archive size={15} className="text-white/60" />
                  <span className="font-medium text-sm">Archive Note</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    exportMarkdown();
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10"
                >
                  <Download size={15} className="text-white/60" />
                  <span className="font-medium text-sm">
                    Export to Markdown
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5 bg-white/10" />
                <DropdownMenuItem
                  className="flex items-center gap-3 px-2 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer focus:bg-red-500/10 focus:text-red-300"
                  onSelect={() => {
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                >
                  <Trash2 size={15} />
                  <span className="font-medium text-sm">Move to Trash</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Editor Area */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth custom-scrollbar">
          {children}
        </main>
      </div>

      {/* Right Panel (Graph & Backlinks) — always render, hidden on mobile via CSS to avoid hydration mismatch */}
      <div
        className={`hidden md:flex flex-col border-l border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] transition-all duration-300 ease-in-out z-20 ${rightPanelOpen ? "w-80" : "w-0 opacity-0 overflow-hidden border-l-0"}`}
      >
        <div className="h-12 border-b border-[hsl(var(--sb-border))] flex items-center px-4 font-medium text-sm text-white shrink-0">
          Local Graph
        </div>

        {/* Mini Graph View — interactive physics */}
        <div className="h-64 border-b border-[hsl(var(--sb-border))] relative overflow-hidden bg-[hsl(var(--sb-bg))] p-3">
          <MiniPhysicsGraph />
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {currentDocId ? (
            <BacklinksPanel docId={currentDocId} compact />
          ) : (
            <p className="text-xs text-[hsl(var(--sb-text-faint))] italic">
              Open a document to see backlinks.
            </p>
          )}
        </div>
      </div>

      {/* Command Palette Overlay */}
      {cmdPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setCmdPaletteOpen(false);
              setCmdPaletteSearch("");
            }}
          />
          <div className="relative w-full max-w-2xl bg-[hsl(var(--sb-bg-panel))] border border-[hsl(var(--sb-border))] rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7),0_0_40px_-10px_hsla(var(--sb-accent-glow)/0.2)] overflow-hidden sb-animate-in flex flex-col">
            <div className="flex items-center px-4 h-14 border-b border-[hsl(var(--sb-border))]">
              <Search size={20} className="text-[hsl(var(--sb-text-muted))]" />
              <input
                type="text"
                placeholder="Search notes, commands, or tags..."
                className="flex-1 bg-transparent border-none text-lg px-4 text-white placeholder:text-[hsl(var(--sb-text-faint))] focus:ring-0 focus:outline-none"
                autoFocus
                value={cmdPaletteSearch}
                onChange={(e) => setCmdPaletteSearch(e.target.value)}
              />
              <div className="text-[10px] text-[hsl(var(--sb-text-faint))] bg-[hsl(var(--sb-bg))] px-2 py-1 rounded border border-[hsl(var(--sb-border))]">
                ESC
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              <div className="px-3 py-2 text-xs font-semibold text-[hsl(var(--sb-text-faint))]">
                SUGGESTIONS
              </div>
              <button
                onClick={() => {
                  setCmdPaletteOpen(false);
                  handleCreateNew();
                }}
                disabled={isCreatingNew}
                className="w-full text-left px-3 py-3 rounded-lg bg-[hsl(var(--sb-accent))/0.1] text-[hsl(var(--sb-accent))] flex items-center justify-between cursor-pointer border border-[hsl(var(--sb-accent))/0.2] hover:bg-[hsl(var(--sb-accent))/0.2] transition-colors disabled:opacity-30"
              >
                <div className="flex items-center gap-3 font-medium">
                  <Plus size={16} /> Create new note
                </div>
                <div className="text-xs font-mono">
                  {isMac ? "⌘N" : "Ctrl+N"}
                </div>
              </button>

              <div className="px-3 py-2 text-xs font-semibold text-[hsl(var(--sb-text-faint))] mt-4">
                RECENT NOTES
              </div>
              <SidebarDocumentList
                search={cmdPaletteSearch}
                tagFilter={sidebarTagFilter}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function SidebarItem({
  icon,
  label,
  onClick,
  expandable,
  expanded,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const handleClick = expandable ? onToggle : onClick;
  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-[hsl(var(--sb-text-muted))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] cursor-pointer transition-colors group"
    >
      <span className="text-[hsl(var(--sb-text-faint))] group-hover:text-white transition-colors">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {expandable && (
        <ChevronDown
          size={12}
          className={`text-[hsl(var(--sb-text-faint))] transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      )}
    </div>
  );
}

function TagBadge({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 rounded border text-xs font-medium cursor-pointer transition-colors flex items-center gap-1 ${
        active
          ? "border-[hsl(var(--sb-accent))] bg-[hsl(var(--sb-accent))]/12 text-[hsl(var(--sb-accent))]"
          : "border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))] text-[hsl(var(--sb-text-muted))] hover:text-white hover:border-[hsl(var(--sb-accent))]"
      }`}
    >
      <Hash size={10} className="text-[hsl(var(--sb-accent))]" />
      {label}
    </button>
  );
}
