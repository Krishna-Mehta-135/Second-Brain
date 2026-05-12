"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  LoadingSpinner,
} from "@repo/ui";
import { Globe, Lock, Link2, Users, Check, XCircle } from "lucide-react";

interface JoinRequest {
  id: string;
  requester: {
    id: string;
    username: string;
    email: string;
  };
  createdAt: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  isPublic: boolean;
  isOwner: boolean;
  docId?: string;
  docTitle?: string;
  onPrivacyChange?: (isPublic: boolean) => void;
}

export function ShareModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceSlug,
  isPublic: initialIsPublic,
  isOwner,
  docId,
  docTitle,
  onPrivacyChange,
}: ShareModalProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [copiedType, setCopiedType] = useState<"workspace" | "document" | null>(
    null,
  );
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null,
  );

  const fetchJoinRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/join-requests`);
      if (res.ok) {
        const data = await res.json();
        setJoinRequests(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Failed to fetch join requests", err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    setIsPublic(initialIsPublic);
  }, [initialIsPublic]);

  useEffect(() => {
    if (isOpen && isOwner) {
      void fetchJoinRequests();
    }
  }, [isOpen, isOwner, fetchJoinRequests]);

  const handleTogglePrivacy = async () => {
    if (!isOwner) return;
    setIsUpdatingPrivacy(true);
    const newStatus = !isPublic;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newStatus }),
      });
      if (res.ok) {
        setIsPublic(newStatus);
        onPrivacyChange?.(newStatus);
      }
    } catch (err) {
      console.error("Failed to update privacy", err);
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const copyToClipboard = (type: "workspace" | "document") => {
    let url = "";
    if (type === "workspace") {
      url = `${window.location.origin}/?ws=${workspaceSlug}`;
    } else if (type === "document" && docId) {
      url = `${window.location.origin}/documents/${docId}`;
    }

    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedType(type);
        setTimeout(() => setCopiedType(null), 2000);
      });
    }
  };

  const handleJoinRequest = async (
    requestId: string,
    action: "accept" | "reject",
  ) => {
    setProcessingRequestId(requestId);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/join-requests/${requestId}/${action}`,
        { method: "POST" },
      );
      if (res.ok) {
        setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (err) {
      console.error(`Failed to ${action} request`, err);
    } finally {
      setProcessingRequestId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0a0a0a] border-white/10 text-white shadow-2xl rounded-2xl p-0 overflow-hidden">
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="text-[hsl(var(--sb-accent))]" size={20} />
              Share & Permissions
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Manage who can access this workspace and its documents.
            </DialogDescription>
          </DialogHeader>

          {/* Privacy Toggle */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${isPublic ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}
              >
                {isPublic ? <Globe size={18} /> : <Lock size={18} />}
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {isPublic ? "Public Workspace" : "Private Workspace"}
                </div>
                <div className="text-[11px] text-white/40">
                  {isPublic
                    ? "Anyone with the link can view and join."
                    : "Access requires an invitation or approval."}
                </div>
              </div>
            </div>
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTogglePrivacy}
                disabled={isUpdatingPrivacy}
                className="h-8 text-[11px] font-bold uppercase tracking-wider border-white/10 hover:bg-white/5 text-white/70"
              >
                {isUpdatingPrivacy ? <LoadingSpinner size="sm" /> : "Change"}
              </Button>
            )}
          </div>

          {/* Sharing Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => copyToClipboard("workspace")}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-[hsl(var(--sb-accent))]/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                {copiedType === "workspace" ? (
                  <Check size={20} className="text-green-400" />
                ) : (
                  <Users size={20} className="text-[hsl(var(--sb-accent))]" />
                )}
              </div>
              <span className="text-xs font-medium">Share Workspace</span>
              <span className="text-[10px] text-white/30 mt-1">
                Copy link to workspace
              </span>
            </button>

            <button
              onClick={() => copyToClipboard("document")}
              disabled={!docId}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                {copiedType === "document" ? (
                  <Check size={20} className="text-green-400" />
                ) : (
                  <Link2 size={20} className="text-blue-400" />
                )}
              </div>
              <span className="text-xs font-medium">Share Document</span>
              <span className="text-[10px] text-white/30 mt-1 truncate max-w-full px-2">
                {docTitle || "Copy link to page"}
              </span>
            </button>
          </div>

          {/* Join Requests (Owner Only) */}
          {isOwner && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">
                  Join Requests{" "}
                  {joinRequests.length > 0 && `(${joinRequests.length})`}
                </h3>
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {isLoadingRequests ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="md" className="text-white/20" />
                  </div>
                ) : joinRequests.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                    <Users size={24} className="mx-auto text-white/10 mb-2" />
                    <p className="text-xs text-white/30">
                      No pending join requests
                    </p>
                  </div>
                ) : (
                  joinRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {request.requester.username}
                        </div>
                        <div className="text-[10px] text-white/40 truncate">
                          {request.requester.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() =>
                            handleJoinRequest(request.id, "accept")
                          }
                          disabled={!!processingRequestId}
                          className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                        >
                          {processingRequestId === request.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Check size={14} />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleJoinRequest(request.id, "reject")
                          }
                          disabled={!!processingRequestId}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
