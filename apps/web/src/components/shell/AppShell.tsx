"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Brain,
  Search,
  Plus,
  Hash,
  ChevronRight,
  Settings,
  Bell,
  Star,
  Clock,
  Network,
  MoreHorizontal,
  Command as CmdIcon,
  ChevronLeft,
  LogOut,
  Archive,
  Download,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { logoutAction } from "@/lib/auth/actions";
import { MiniPhysicsGraph } from "./MiniPhysicsGraph";
import { SidebarDocumentList } from "./SidebarDocumentList";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setIsMac(navigator.userAgent.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  // Toggle cmd palette with meta+k
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCmdPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const userInitials =
    mounted && auth.status === "authenticated"
      ? auth.session.user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "??";

  const userName =
    mounted && auth.status === "authenticated"
      ? auth.session.user.name
      : "Guest";

  return (
    <div className="sb-root flex h-screen w-full bg-[hsl(var(--sb-bg))] text-[hsl(var(--sb-text))] overflow-hidden font-sans">
      {/* Left Sidebar */}
      <div
        className={`flex flex-col border-r border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] transition-all duration-300 ease-in-out ${sidebarOpen ? "w-64" : "w-0 opacity-0 overflow-hidden"}`}
      >
        <div className="h-12 flex items-center justify-between px-4 border-b border-[hsl(var(--sb-border))] shrink-0">
          <div className="flex items-center gap-2 font-medium text-sm">
            <div className="w-5 h-5 rounded bg-[hsl(var(--sb-accent))] flex items-center justify-center shadow-[0_0_10px_0_hsla(var(--sb-accent-glow)/0.4)]">
              <Brain size={12} className="text-white" />
            </div>
            {userName}&apos;s Brain
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors">
              <Bell size={14} />
            </button>
            <button className="p-1 rounded text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors">
              <Settings size={14} />
            </button>
          </div>
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

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4 custom-scrollbar">
          <div className="space-y-0.5">
            <SidebarItem icon={<Clock size={14} />} label="Recent" />
            <SidebarItem icon={<Star size={14} />} label="Starred" />
            <SidebarItem
              icon={<Network size={14} />}
              label="Graph View"
              onClick={() => router.push("/graph")}
            />
          </div>

          <div>
            <div className="px-3 py-1 text-xs font-semibold tracking-wider text-[hsl(var(--sb-text-faint))] uppercase flex items-center justify-between group">
              WORKSPACE
              <button
                onClick={() => router.push("/documents/new")}
                className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity cursor-pointer"
              >
                <Plus size={12} />
              </button>
            </div>
            <div className="space-y-0.5 mt-1">
              <SidebarDocumentList search={search} />
            </div>
          </div>

          <div>
            <div className="px-3 py-1 text-xs font-semibold tracking-wider text-[hsl(var(--sb-text-faint))] uppercase">
              TAGS
            </div>
            <div className="flex flex-wrap gap-1.5 px-3 mt-1">
              <TagBadge label="architecture" />
              <TagBadge label="design" />
              <TagBadge label="urgent" />
              <TagBadge label="idea" />
            </div>
          </div>
        </div>

        {/* User profile bottom */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="h-14 border-t border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] flex items-center px-4 gap-3 hover:bg-[hsl(var(--sb-bg-hover))] cursor-pointer transition-colors shrink-0">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black border border-white/10 text-xs font-bold text-white shadow-sm">
                {userInitials ? userInitials.charAt(0) : "?"}
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[hsl(var(--sb-bg-panel))]" />
              </div>
              <div className="text-sm font-medium flex-1 truncate">
                {userName}
              </div>
              <Settings
                size={14}
                className="text-[hsl(var(--sb-text-faint))] hover:text-white transition-colors"
              />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-56 p-2 bg-[#050505]/95 backdrop-blur-xl border-white/10 text-white shadow-2xl rounded-xl mb-2"
          >
            <DropdownMenuItem className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10">
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
        <header className="h-12 border-b border-[hsl(var(--sb-border))] flex items-center justify-between px-4 shrink-0 bg-[hsl(var(--sb-bg))/0.8] backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors"
            >
              {sidebarOpen ? (
                <ChevronLeft size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--sb-text-muted))]">
              <span>Workspace</span>
              <ChevronRight
                size={12}
                className="text-[hsl(var(--sb-text-faint))]"
              />
              <span className="text-white font-medium truncate max-w-[200px]">
                Current Note
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-[hsl(var(--sb-text-faint))] mr-2">
              Online
            </div>
            <button className="text-sm font-medium px-3 py-1.5 rounded bg-[hsl(var(--sb-bg-panel))] border border-[hsl(var(--sb-border))] hover:border-[hsl(var(--sb-accent))] transition-colors">
              Share
            </button>
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={`p-1.5 rounded transition-colors ${rightPanelOpen ? "text-white bg-[hsl(var(--sb-bg-hover))]" : "text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))]"}`}
            >
              <Network size={16} />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 p-2 bg-[#050505]/95 backdrop-blur-xl border-white/10 text-white shadow-2xl rounded-xl"
              >
                <div className="px-2 py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Document Settings
                </div>
                <DropdownMenuItem className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10">
                  <Star size={15} className="text-white/60" />
                  <span className="font-medium text-sm">Star Document</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10">
                  <Archive size={15} className="text-white/60" />
                  <span className="font-medium text-sm">Archive Note</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10">
                  <Download size={15} className="text-white/60" />
                  <span className="font-medium text-sm">
                    Export to Markdown
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5 bg-white/10" />
                <DropdownMenuItem className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10 cursor-pointer focus:bg-white/10">
                  <Settings size={15} className="text-white/60" />
                  <span className="font-medium text-sm">
                    Workspace Settings
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-3 px-2 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer focus:bg-red-500/10 focus:text-red-300">
                  <Trash2 size={15} />
                  <span className="font-medium text-sm">Move to Trash</span>
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
        </header>

        {/* Editor Area */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth custom-scrollbar">
          {children}
        </main>
      </div>

      {/* Right Panel (Graph & Backlinks) */}
      <div
        className={`flex flex-col border-l border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] transition-all duration-300 ease-in-out ${rightPanelOpen ? "w-80" : "w-0 opacity-0 overflow-hidden border-l-0"}`}
      >
        <div className="h-12 border-b border-[hsl(var(--sb-border))] flex items-center px-4 font-medium text-sm text-white shrink-0">
          Local Graph
        </div>

        {/* Mini Graph View — interactive physics */}
        <div className="h-64 border-b border-[hsl(var(--sb-border))] relative overflow-hidden bg-[hsl(var(--sb-bg))] p-3">
          <MiniPhysicsGraph />
          <button className="absolute top-2 right-2 p-1.5 rounded bg-[hsl(var(--sb-bg-panel))] border border-[hsl(var(--sb-border))] hover:border-[hsl(var(--sb-accent))] text-[hsl(var(--sb-text-faint))] hover:text-white transition-all shadow-lg z-10">
            <Network size={12} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="font-semibold text-xs tracking-wider text-[hsl(var(--sb-text-faint))] mb-4 uppercase">
            BACKLINKS (0)
          </div>

          <div className="space-y-4">
            <p className="text-xs text-[hsl(var(--sb-text-faint))] italic">
              No backlinks found.
            </p>
          </div>
        </div>
      </div>

      {/* Command Palette Overlay */}
      {cmdPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCmdPaletteOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-[hsl(var(--sb-bg-panel))] border border-[hsl(var(--sb-border))] rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7),0_0_40px_-10px_hsla(var(--sb-accent-glow)/0.2)] overflow-hidden sb-animate-in flex flex-col">
            <div className="flex items-center px-4 h-14 border-b border-[hsl(var(--sb-border))]">
              <Search size={20} className="text-[hsl(var(--sb-text-muted))]" />
              <input
                type="text"
                placeholder="Search notes, commands, or tags..."
                className="flex-1 bg-transparent border-none text-lg px-4 text-white placeholder:text-[hsl(var(--sb-text-faint))] focus:ring-0 focus:outline-none"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  router.push("/documents/new");
                }}
                className="w-full text-left px-3 py-3 rounded-lg bg-[hsl(var(--sb-accent))/0.1] text-[hsl(var(--sb-accent))] flex items-center justify-between cursor-pointer border border-[hsl(var(--sb-accent))/0.2] hover:bg-[hsl(var(--sb-accent))/0.2] transition-colors"
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
              <SidebarDocumentList search={search} />
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-[hsl(var(--sb-text-muted))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] cursor-pointer transition-colors group"
    >
      <span className="text-[hsl(var(--sb-text-faint))] group-hover:text-white transition-colors">
        {icon}
      </span>
      {label}
    </div>
  );
}

function TagBadge({ label }: { label: string }) {
  return (
    <div className="px-2 py-0.5 rounded border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))] text-xs font-medium text-[hsl(var(--sb-text-muted))] hover:text-white hover:border-[hsl(var(--sb-accent))] cursor-pointer transition-colors flex items-center gap-1">
      <Hash size={10} className="text-[hsl(var(--sb-accent))]" />
      {label}
    </div>
  );
}
