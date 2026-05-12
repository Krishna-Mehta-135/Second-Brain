"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Lock, Plus, UserPlus, Check, X } from "lucide-react";
import { useWorkspace } from "@/lib/workspaces/WorkspaceProvider";
import type { WorkspaceRecord } from "@repo/types";

type JoinRequestRow = {
  id: string;
  userId: string;
  requester?: { username?: string; email?: string };
};

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const {
    memberships,
    activeWorkspaceId,
    setActiveWorkspaceId,
    refresh,
    isLoading,
  } = useWorkspace();

  const [wsName, setWsName] = useState("");
  const [wsPublic, setWsPublic] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPublic, setNewPublic] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  const [publicList, setPublicList] = useState<
    Pick<WorkspaceRecord, "id" | "name" | "slug" | "ownerId">[]
  >([]);
  const [requests, setRequests] = useState<JoinRequestRow[]>([]);

  const active = useMemo(() => {
    return memberships.find((m) => m.workspace.id === activeWorkspaceId);
  }, [memberships, activeWorkspaceId]);

  const activeWs = active?.workspace ?? null;
  const isOwner = active?.role === "owner";

  useEffect(() => {
    if (!activeWs) return;
    setWsName(activeWs.name);
    setWsPublic(activeWs.isPublic);
  }, [activeWs]);

  const loadPublic = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces/public", {
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      const rows = Array.isArray(body?.data) ? body.data : [];
      setPublicList(rows);
    } catch {
      setPublicList([]);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    if (!activeWorkspaceId || !isOwner) {
      setRequests([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspaceId}/join-requests`,
        { credentials: "include" },
      );
      const body = await res.json().catch(() => ({}));
      const rows = Array.isArray(body?.data) ? body.data : [];
      setRequests(rows);
    } catch {
      setRequests([]);
    }
  }, [activeWorkspaceId, isOwner]);

  useEffect(() => {
    loadPublic();
  }, [loadPublic]);

  useEffect(() => {
    loadRequests();
    if (!isOwner || !activeWorkspaceId) return;
    const id = setInterval(loadRequests, 40000);
    return () => clearInterval(id);
  }, [loadRequests, isOwner, activeWorkspaceId]);

  async function saveWorkspace() {
    if (!activeWorkspaceId || !isOwner) return;
    setSaveBusy(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: (wsName.trim() || activeWs?.name)?.trim(),
          isPublic: wsPublic,
        }),
      });
      if (res.ok) await refresh();
    } finally {
      setSaveBusy(false);
    }
  }

  async function createWorkspace(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreateBusy(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isPublic: newPublic }),
      });
      const body = await res.json().catch(() => ({}));
      const ws = body?.data?.workspace;
      if (res.ok && ws?.id) {
        setNewName("");
        setNewPublic(false);
        await refresh();
        setActiveWorkspaceId(ws.id);
      }
    } finally {
      setCreateBusy(false);
    }
  }

  async function acceptRequest(requestId: string) {
    if (!activeWorkspaceId) return;
    await fetch(
      `/api/workspaces/${activeWorkspaceId}/join-requests/${requestId}/accept`,
      { method: "POST", credentials: "include" },
    );
    await loadRequests();
    await refresh();
  }

  async function rejectRequest(requestId: string) {
    if (!activeWorkspaceId) return;
    await fetch(
      `/api/workspaces/${activeWorkspaceId}/join-requests/${requestId}/reject`,
      { method: "POST", credentials: "include" },
    );
    await loadRequests();
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-[hsl(var(--sb-bg))] p-8 text-sm text-[hsl(var(--sb-text-muted))]">
        Loading workspaces…
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[hsl(var(--sb-bg))] text-[hsl(var(--sb-text))]">
      <div className="h-12 border-b border-[hsl(var(--sb-border))] flex items-center px-6 gap-4 bg-[hsl(var(--sb-bg-panel))]/60 sticky top-0 z-10 backdrop-blur-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1.5 rounded text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="font-semibold text-sm text-white">Workspace settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold tracking-widest text-[hsl(var(--sb-text-faint))] uppercase">
            Your workspaces
          </h2>
          <div className="rounded-xl border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] divide-y divide-[hsl(var(--sb-border))] overflow-hidden">
            {memberships.length === 0 ? (
              <p className="p-4 text-sm text-[hsl(var(--sb-text-muted))]">
                No workspaces yet. Create one below.
              </p>
            ) : (
              memberships.map((m) => {
                const w = m.workspace;
                const selected = w.id === activeWorkspaceId;
                return (
                  <button
                    type="button"
                    key={w.id}
                    onClick={() => setActiveWorkspaceId(w.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                      selected
                        ? "bg-[hsl(var(--sb-accent))]/10"
                        : "hover:bg-[hsl(var(--sb-bg-hover))]"
                    }`}
                  >
                    {w.isPublic ? (
                      <Globe
                        size={16}
                        className="text-[hsl(var(--sb-accent))] shrink-0"
                      />
                    ) : (
                      <Lock size={16} className="text-white/50 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {w.name}
                      </div>
                      <div className="text-[11px] text-[hsl(var(--sb-text-faint))] truncate">
                        {w.slug} · {m.role}
                      </div>
                    </div>
                    {selected ? (
                      <span className="text-[10px] uppercase font-bold text-[hsl(var(--sb-accent))]">
                        Active
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {activeWs && isOwner ? (
          <section className="space-y-3">
            <h2 className="text-[11px] font-bold tracking-widest text-[hsl(var(--sb-text-faint))] uppercase">
              Active workspace
            </h2>
            <div className="rounded-xl border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] p-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--sb-text-faint))]">
                  Name
                </span>
                <input
                  className="w-full rounded-lg border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))] px-3 py-2 text-sm text-white"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-[hsl(var(--sb-border))]"
                  checked={wsPublic}
                  onChange={(e) => setWsPublic(e.target.checked)}
                />
                <span className="text-sm text-[hsl(var(--sb-text-muted))]">
                  Public — anyone with the slug can join without approval
                </span>
              </label>
              <button
                type="button"
                disabled={saveBusy}
                onClick={() => void saveWorkspace()}
                className="px-4 py-2 rounded-lg bg-[hsl(var(--sb-accent))] text-white text-sm font-medium disabled:opacity-50"
              >
                {saveBusy ? "Saving…" : "Save changes"}
              </button>
              <p className="text-xs text-[hsl(var(--sb-text-faint))]">
                Private workspaces require you to approve join requests (see
                below). Share the{" "}
                <span className="text-white/80 font-mono">{activeWs.slug}</span>{" "}
                slug so others can find and join via the &quot;Join&quot; button
                in the topbar.
              </p>
            </div>
          </section>
        ) : null}

        {activeWs && isOwner && requests.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-[11px] font-bold tracking-widest text-[hsl(var(--sb-text-faint))] uppercase flex items-center gap-2">
              <UserPlus size={14} />
              Join requests
            </h2>
            <div className="rounded-xl border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] divide-y divide-[hsl(var(--sb-border))] overflow-hidden">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {r.requester?.username ?? r.userId}
                    </div>
                    <div className="text-[11px] text-[hsl(var(--sb-text-faint))] truncate">
                      {r.requester?.email ?? ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Accept"
                    onClick={() => void acceptRequest(r.id)}
                    className="p-2 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    title="Reject"
                    onClick={() => void rejectRequest(r.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold tracking-widest text-[hsl(var(--sb-text-faint))] uppercase">
            Create workspace
          </h2>
          <form
            onSubmit={createWorkspace}
            className="rounded-xl border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] p-5 space-y-4"
          >
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--sb-text-faint))]">
                Name
              </span>
              <input
                className="w-full rounded-lg border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))] px-3 py-2 text-sm text-white"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Team wiki"
              />
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-[hsl(var(--sb-border))]"
                checked={newPublic}
                onChange={(e) => setNewPublic(e.target.checked)}
              />
              <span className="text-sm text-[hsl(var(--sb-text-muted))]">
                Public workspace
              </span>
            </label>
            <button
              type="submit"
              disabled={createBusy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[hsl(var(--sb-border))] text-sm font-medium hover:border-[hsl(var(--sb-accent))] disabled:opacity-50"
            >
              <Plus size={16} />
              {createBusy ? "Creating…" : "Create"}
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-bold tracking-widest text-[hsl(var(--sb-text-faint))] uppercase">
            Public workspaces
          </h2>
          <p className="text-sm text-[hsl(var(--sb-text-muted))]">
            Recent public workspaces:
          </p>
          <div className="rounded-xl border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] divide-y divide-[hsl(var(--sb-border))] overflow-hidden">
            {publicList.length === 0 ? (
              <p className="p-4 text-sm text-[hsl(var(--sb-text-muted))]">
                None listed.
              </p>
            ) : (
              publicList.slice(0, 12).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center px-4 py-3 gap-3 text-sm"
                >
                  <Globe size={15} className="text-[hsl(var(--sb-accent))]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">
                      {w.name}
                    </div>
                    <div className="text-[11px] text-[hsl(var(--sb-text-faint))] font-mono truncate">
                      {w.slug}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
