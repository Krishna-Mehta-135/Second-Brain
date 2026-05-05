"use client";

import { useAuth } from "@/lib/auth/useAuth";
import { logoutAction } from "@/lib/auth/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  User,
  Mail,
  LogOut,
  Shield,
  ArrowLeft,
  ChevronRight,
  Settings,
} from "lucide-react";

export default function SettingsPage() {
  const auth = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const user = auth.status === "authenticated" ? auth.session.user : null;

  const handleUpdateName = async () => {
    if (!user) return;
    const newName = window.prompt("Enter new display name:", user.name);
    if (!newName || newName.trim() === "" || newName === user.name) return;

    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const error = await res.json().catch(() => ({}));
        alert(error?.message || "Failed to update display name");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred");
    }
  };

  const sections = [
    {
      title: "Workspace",
      items: [
        {
          icon: <Settings size={16} className="text-[hsl(var(--sb-accent))]" />,
          label: "Workspaces & sharing",
          value: "Switch, visibility, invites",
          action: "/settings/workspace",
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: <User size={16} className="text-[hsl(var(--sb-accent))]" />,
          label: "Display name",
          value: user?.name ?? "—",
          action: handleUpdateName,
        },
        {
          icon: <Mail size={16} className="text-[hsl(var(--sb-accent))]" />,
          label: "Email address",
          value: user?.email ?? "—",
          action: null,
        },
      ],
    },
    {
      title: "Security",
      items: [
        {
          icon: <Shield size={16} className="text-green-400" />,
          label: "Password",
          value: "Change password",
          action: null,
        },
      ],
    },
  ];

  return (
    <div className="min-h-full bg-[hsl(var(--sb-bg))] text-[hsl(var(--sb-text))]">
      {/* Header */}
      <div className="h-12 border-b border-[hsl(var(--sb-border))] flex items-center px-6 gap-4 bg-[hsl(var(--sb-bg-panel))]/60 sticky top-0 z-10 backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded text-[hsl(var(--sb-text-faint))] hover:text-white hover:bg-[hsl(var(--sb-bg-hover))] transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="font-semibold text-sm text-white">Account Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--sb-accent))] flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_24px_hsla(var(--sb-accent-glow)/0.4)]">
            {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-lg font-semibold text-white">
              {user?.name ?? "Guest"}
            </p>
            <p className="text-sm text-[hsl(var(--sb-text-muted))]">
              {user?.email ?? ""}
            </p>
          </div>
        </div>

        {/* Settings sections */}
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-[11px] font-bold tracking-widest text-[hsl(var(--sb-text-faint))] uppercase mb-3">
              {section.title}
            </h2>
            <div className="rounded-xl border border-[hsl(var(--sb-border))] bg-[hsl(var(--sb-bg-panel))] overflow-hidden divide-y divide-[hsl(var(--sb-border))]">
              {section.items.map((item) => {
                const clickable = item.action !== null;
                const Wrapper: "button" | "div" = clickable ? "button" : "div";
                const extra =
                  clickable && item.action
                    ? ({
                        type: "button",
                        onClick: () => {
                          if (typeof item.action === "string") {
                            router.push(item.action);
                          } else if (typeof item.action === "function") {
                            item.action();
                          }
                        },
                      } as const)
                    : {};
                return (
                  <Wrapper
                    key={item.label}
                    {...extra}
                    className={`w-full flex items-center px-4 py-3.5 gap-3 group text-left transition-colors ${
                      clickable
                        ? "hover:bg-[hsl(var(--sb-bg-hover))] cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="flex-1 text-sm text-[hsl(var(--sb-text-muted))] group-hover:text-white transition-colors">
                      {item.label}
                    </span>
                    <span className="text-sm text-[hsl(var(--sb-text-faint))]">
                      {item.value}
                    </span>
                    {clickable ? (
                      <ChevronRight
                        size={14}
                        className="text-[hsl(var(--sb-text-faint))] opacity-40"
                      />
                    ) : (
                      <ChevronRight
                        size={14}
                        className="text-[hsl(var(--sb-text-faint))] opacity-[0.15]"
                      />
                    )}
                  </Wrapper>
                );
              })}
            </div>
          </div>
        ))}

        {/* Danger zone */}
        <div>
          <h2 className="text-[11px] font-bold tracking-widest text-red-500/70 uppercase mb-3">
            Danger Zone
          </h2>
          <div className="rounded-xl border border-red-500/20 bg-[hsl(var(--sb-bg-panel))] overflow-hidden">
            <button
              onClick={() =>
                startTransition(async () => {
                  await logoutAction();
                })
              }
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <LogOut size={16} />
              <span className="text-sm font-medium">
                {isPending ? "Signing out…" : "Sign out"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
