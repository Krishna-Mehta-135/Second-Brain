"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { useWorkspace } from "@/lib/workspaces/WorkspaceProvider";

export default function JoinWorkspacePage() {
  const router = useRouter();
  const { refresh } = useWorkspace();
  const [slug, setSlug] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const s = slug.trim().toLowerCase();
    if (!s) {
      setErr("Enter a workspace slug.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/workspaces/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: s }),
      });
      const body = await res.json().catch(() => ({}));
      const status =
        typeof body?.data?.status === "string" ? body.data.status : "";
      if (!res.ok) {
        setErr(body?.message || "Could not join this workspace.");
        return;
      }
      await refresh();
      if (status === "pending_approval") {
        setMsg(
          "Request sent. The workspace owner can approve you under Workspace settings.",
        );
      } else if (status === "joined" || status === "member") {
        setMsg(
          "You are now in this workspace. Switch it from the sidebar menu.",
        );
      } else {
        setMsg("Done.");
      }
    } finally {
      setBusy(false);
    }
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
        <h1 className="font-semibold text-sm text-white">Join a workspace</h1>
      </div>

      <div className="max-w-lg mx-auto px-6 py-10 space-y-6">
        <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] p-5">
          <Users
            className="text-[hsl(var(--sb-accent))] shrink-0 mt-0.5"
            size={22}
          />
          <div className="space-y-1 text-sm">
            <p className="text-white font-medium">
              Slug from the workspace owner
            </p>
            <p className="text-[hsl(var(--sb-text-muted))] leading-relaxed">
              Public workspaces add you instantly. Private ones need owner
              approval—you will get access after they accept the request under{" "}
              <span className="text-[hsl(var(--sb-accent))]">
                Workspace settings
              </span>
              .
            </p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] p-6 space-y-4"
        >
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--sb-text-faint))]">
              Workspace slug
            </span>
            <input
              className="w-full rounded-lg border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg))] px-3 py-2 text-sm text-white placeholder:text-[hsl(var(--sb-text-faint))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--sb-accent))]"
              placeholder="e.g. acme-team"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>
          {err ? <p className="text-sm text-red-400">{err}</p> : null}
          {msg ? (
            <p className="text-sm text-[hsl(var(--sb-text-muted))]">{msg}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-[hsl(var(--sb-accent))] text-white text-sm font-medium hover:opacity-95 disabled:opacity-50 transition-opacity"
            >
              {busy ? "Joining…" : "Join"}
            </button>
            <Link
              href="/settings/workspace"
              className="px-4 py-2 rounded-lg border border-[hsl(var(--sb-border))] text-sm text-[hsl(var(--sb-text-muted))] hover:text-white hover:border-[hsl(var(--sb-accent))] transition-colors"
            >
              Manage workspaces
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
