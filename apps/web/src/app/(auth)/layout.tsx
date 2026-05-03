import React from "react";
import { LogoMark } from "@/components/ui/LogoMark";
import { AppMockup } from "@/components/auth/AppMockup";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="sb-root flex h-screen w-full overflow-hidden bg-[hsl(240,10%,4%)]">
      {/* ── Left — App preview ── */}
      <div className="hidden lg:flex w-[54%] relative flex-col justify-between p-12 overflow-hidden border-r border-white/[0.05]">
        {/* Subtle gradient bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(99,102,241,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5 text-white font-semibold text-lg tracking-tight">
          <LogoMark size={28} />
          Second Brain
        </div>

        {/* App mockup */}
        <div
          className="relative z-10 w-full"
          style={{
            transform: "perspective(1200px) rotateX(2deg) rotateY(-2deg)",
            transformOrigin: "center center",
          }}
        >
          <AppMockup />
        </div>

        {/* Social proof + testimonial */}
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-5">
            {[
              ["12K+", "researchers"],
              ["50M+", "notes linked"],
              ["4.9★", "App Store"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="text-lg font-bold text-white">{n}</div>
                <div className="text-zinc-600 text-xs">{l}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="w-0.5 rounded-full bg-indigo-500/40 flex-shrink-0 mt-1" />
            <div>
              <blockquote className="text-sm text-white/80 italic leading-relaxed mb-2">
                &quot;It feels less like software and more like an extension of
                my own mind.&quot;
              </blockquote>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white">
                  RC
                </div>
                <span className="text-xs text-zinc-500">
                  Dr. Robert Chen · Lead Researcher
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right — Form ── */}
      <div className="w-full lg:w-[46%] flex items-center justify-center px-10 py-8 relative overflow-hidden">
        <div className="w-full max-w-sm relative z-10">{children}</div>
      </div>
    </div>
  );
}
