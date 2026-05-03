import React from "react";
import { FileText, Search, Star, Clock, Network } from "lucide-react";
import { LogoMark } from "@/components/ui/LogoMark";

export function AppMockup() {
  return (
    <div
      className="w-full rounded-xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "hsl(240,10%,7%)",
      }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-1.5 px-3 py-2.5 border-b border-white/[0.06]"
        style={{ background: "hsl(240,10%,6%)" }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <div className="flex-1 mx-3 h-4 rounded bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <span className="text-[8px] text-zinc-600">knowdex.app</span>
        </div>
      </div>
      {/* App layout */}
      <div className="flex h-52">
        {/* Sidebar */}
        <div
          className="w-36 border-r border-white/[0.06] flex flex-col p-2 gap-1 shrink-0"
          style={{ background: "hsl(240,10%,6%)" }}
        >
          <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
            <LogoMark size={14} />
            <span className="text-[9px] text-white font-medium">
              Robert&apos;s Brain
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.04] mx-1">
            <Search size={8} className="text-zinc-500" />
            <span className="text-[8px] text-zinc-500">Search...</span>
          </div>
          {[
            { icon: <Clock size={8} />, label: "Recent" },
            { icon: <Star size={8} />, label: "Starred" },
            { icon: <Network size={8} />, label: "Graph View" },
          ].map((i) => (
            <div
              key={i.label}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-zinc-500 text-[8px]"
            >
              {i.icon}
              {i.label}
            </div>
          ))}
          <div className="px-2 py-1 text-[7px] font-bold text-zinc-700 uppercase tracking-wider mt-1">
            Workspace
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-zinc-400 text-[8px]">
            <span>▾</span> Projects
          </div>
          <div className="pl-4 flex items-center gap-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[8px]">
            <FileText size={7} /> On Networked Thought
          </div>
          <div className="pl-4 flex items-center gap-1 py-0.5 text-zinc-600 text-[8px]">
            <FileText size={7} /> Zettelkasten Method
          </div>
          <div className="pl-4 flex items-center gap-1 py-0.5 text-zinc-600 text-[8px]">
            <FileText size={7} /> Spaced Repetition
          </div>
        </div>
        {/* Editor */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="text-[11px] font-bold text-white mb-2">
            On Networked Thought
          </div>
          <div className="text-[8px] text-zinc-500 mb-3 leading-relaxed">
            The goal of this note is to explore how ideas connect in a
            non-linear fashion, similar to how the human mind naturally...
          </div>
          <div
            className="flex items-start gap-1.5 rounded-lg p-2 mb-2"
            style={{
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.15)",
            }}
          >
            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1 shrink-0" />
            <div className="text-[8px] text-indigo-300">
              Links to <span className="underline">[[Zettelkasten]]</span> ·{" "}
              <span className="underline">[[Memory Systems]]</span>
            </div>
          </div>
          <div className="text-[8px] text-zinc-600 leading-relaxed">
            This connects to ideas in{" "}
            <span className="text-indigo-400">[[Spaced Repetition]]</span> and
            the broader notion of...
          </div>
        </div>
      </div>
    </div>
  );
}
