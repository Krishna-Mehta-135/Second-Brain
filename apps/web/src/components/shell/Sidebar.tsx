"use client";

import { useState } from "react";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarDocumentList } from "./SidebarDocumentList";
import { NewDocumentButton } from "./NewDocumentButton";
import { ScrollArea, Input } from "@repo/ui";
import { Search } from "lucide-react";

export function Sidebar() {
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col h-full bg-surface border-r border-border">
      <SidebarHeader />

      <div className="px-3 py-4 space-y-3">
        <NewDocumentButton />
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-9 bg-background/50 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 pb-4">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1">
          Your Documents
        </div>
        <SidebarDocumentList search={search} />
      </ScrollArea>
    </div>
  );
}
