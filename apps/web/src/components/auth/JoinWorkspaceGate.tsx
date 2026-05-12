"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  Lock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { Button, LoadingSpinner } from "@repo/ui";
import { useWorkspace } from "@/lib/workspaces/WorkspaceProvider";

interface WorkspaceMetadata {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
}

interface JoinWorkspaceGateProps {
  docId: string;
  docTitle: string;
  workspace: WorkspaceMetadata;
}

export function JoinWorkspaceGate({
  docTitle,
  workspace,
}: Omit<JoinWorkspaceGateProps, "docId">) {
  const [isJoining, setIsJoining] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "success" | "pending" | "error"
  >("idle");
  const { memberships, refresh } = useWorkspace();

  // Poll for membership changes when status is pending
  useEffect(() => {
    if (status !== "pending") return;

    const interval = setInterval(async () => {
      await refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, [status, refresh]);

  // Check if we became a member during polling
  useEffect(() => {
    const isNowMember = memberships.some(
      (m) => m.workspace.id === workspace.id,
    );
    if (isNowMember && status === "pending") {
      setStatus("success");
      if (typeof window !== "undefined") {
        localStorage.setItem("knowdex:activeWorkspaceId", workspace.id);
      }
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, [memberships, workspace.id, status]);

  const handleAction = async () => {
    setIsJoining(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/workspaces/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: workspace.slug }),
      });

      const data = await res.json();
      const payload = data.data ?? data;

      if (payload.status === "joined" || payload.status === "member") {
        if (typeof window !== "undefined") {
          localStorage.setItem("knowdex:activeWorkspaceId", workspace.id);
        }
        setStatus("success");
        // Reload to refresh the WorkspaceProvider and DocumentsProvider
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else if (payload.status === "pending_approval") {
        setStatus("pending");
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error("Join error:", err);
      setStatus("error");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-md bg-[hsl(var(--sb-bg-panel))] border border-[hsl(var(--sb-border))] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[hsl(var(--sb-accent))]/10 p-8 border-b border-[hsl(var(--sb-border))] flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--sb-accent))] flex items-center justify-center mb-4 shadow-lg shadow-[hsl(var(--sb-accent))]/20">
            {workspace.isPublic ? (
              <Globe className="text-white w-8 h-8" />
            ) : (
              <Lock className="text-white w-8 h-8" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {workspace.isPublic ? "Join Workspace" : "Access Requested"}
          </h2>
          <p className="text-[hsl(var(--sb-text-muted))] text-sm">
            {workspace.isPublic
              ? "This document belongs to a public workspace."
              : "This document is part of a private workspace."}
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="bg-[hsl(var(--sb-bg))] border border-[hsl(var(--sb-border))] rounded-xl p-4">
              <div className="text-[10px] font-bold text-[hsl(var(--sb-text-faint))] uppercase tracking-widest mb-1">
                Document
              </div>
              <div className="text-white font-medium truncate">
                {docTitle || "Untitled Note"}
              </div>
            </div>

            <div className="bg-[hsl(var(--sb-bg))] border border-[hsl(var(--sb-border))] rounded-xl p-4">
              <div className="text-[10px] font-bold text-[hsl(var(--sb-text-faint))] uppercase tracking-widest mb-1">
                Workspace
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{workspace.name}</span>
                <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-[hsl(var(--sb-text-muted))]">
                  {workspace.slug}
                </span>
              </div>
            </div>
          </div>

          {status === "idle" && (
            <Button
              onClick={handleAction}
              disabled={isJoining}
              className="w-full h-12 text-base font-semibold bg-[hsl(var(--sb-accent))] hover:bg-[hsl(var(--sb-accent-glow))] text-white gap-2 transition-all"
            >
              {isJoining ? (
                <LoadingSpinner className="w-5 h-5" />
              ) : (
                <>
                  {workspace.isPublic ? "Join Workspace" : "Request Access"}
                  <ArrowRight size={18} />
                </>
              )}
            </Button>
          )}

          {status === "success" && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400">
              <CheckCircle2 size={20} />
              <div className="text-sm font-medium">Joined! Redirecting...</div>
            </div>
          )}

          {status === "pending" && (
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <ShieldAlert size={20} />
              <div className="text-sm font-medium">
                Access requested. Waiting for owner approval.
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <ShieldAlert size={20} />
              <div className="text-sm font-medium">
                Something went wrong. Please try again.
              </div>
            </div>
          )}

          <p className="text-center text-[hsl(var(--sb-text-faint))] text-[11px] leading-relaxed">
            {workspace.isPublic
              ? "By joining, you will be able to edit and view all documents in this workspace."
              : "Private workspaces require the owner to manually approve each member."}
          </p>
        </div>
      </div>
    </div>
  );
}
