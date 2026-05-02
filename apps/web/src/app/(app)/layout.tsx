"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { MobileSidebarDrawer } from "@/components/shell/MobileSidebarDrawer";
import { DocumentsProvider } from "@/lib/documents/useDocuments";
import { Menu } from "lucide-react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <DocumentsProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col">
          <Sidebar />
        </aside>

        {/* Mobile sidebar drawer */}
        <MobileSidebarDrawer
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Mobile header with hamburger */}
          <div className="md:hidden flex items-center h-12 px-4 border-b border-border bg-surface">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 rounded hover:bg-surface-hover transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="ml-3 font-semibold text-sm">Second Brain</span>
          </div>

          <div className="flex-1 overflow-auto">{children}</div>
        </main>
      </div>
    </DocumentsProvider>
  );
}
