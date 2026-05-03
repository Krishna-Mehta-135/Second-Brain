"use client";
import type { Editor } from "@tiptap/react";
import { Tooltip, TooltipContent, TooltipTrigger, Separator } from "@repo/ui";
import { useUndoManager } from "./hooks/useUndoManager";
import { useSyncManager } from "@/lib/sync/SyncContext";

interface ToolbarProps {
  editor?: Editor | null;
}

export function EditorToolbar({ editor }: ToolbarProps) {
  const manager = useSyncManager();
  const { undo, redo, canUndo, canRedo } = useUndoManager(manager.doc);

  // If no editor is provided yet, we still show the toolbar but formatting is disabled
  const isReady = !!editor;

  const groups = [
    {
      label: "History",
      items: [
        {
          label: "Undo",
          shortcut: "⌘Z",
          action: undo,
          active: false,
          disabled: !canUndo,
          icon: "↩",
        },
        {
          label: "Redo",
          shortcut: "⌘⇧Z",
          action: redo,
          active: false,
          disabled: !canRedo,
          icon: "↪",
        },
      ],
    },
    {
      label: "Format",
      items: [
        {
          label: "Bold",
          shortcut: "⌘B",
          action: () => editor?.chain().focus().toggleBold().run(),
          active: editor?.isActive("bold") ?? false,
          disabled: !isReady,
          icon: "B",
        },
        {
          label: "Italic",
          shortcut: "⌘I",
          action: () => editor?.chain().focus().toggleItalic().run(),
          active: editor?.isActive("italic") ?? false,
          disabled: !isReady,
          icon: "I",
        },
        {
          label: "Strike",
          shortcut: "⌘⇧S",
          action: () => editor?.chain().focus().toggleStrike().run(),
          active: editor?.isActive("strike") ?? false,
          disabled: !isReady,
          icon: "S̶",
        },
        {
          label: "Code",
          shortcut: "⌘E",
          action: () => editor?.chain().focus().toggleCode().run(),
          active: editor?.isActive("code") ?? false,
          disabled: !isReady,
          icon: "``",
        },
      ],
    },
    {
      label: "Structure",
      items: [
        {
          label: "H1",
          action: () =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run(),
          active: editor?.isActive("heading", { level: 1 }) ?? false,
          disabled: !isReady,
          icon: "H1",
        },
        {
          label: "H2",
          action: () =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run(),
          active: editor?.isActive("heading", { level: 2 }) ?? false,
          disabled: !isReady,
          icon: "H2",
        },
        {
          label: "Bullet List",
          action: () => editor?.chain().focus().toggleBulletList().run(),
          active: editor?.isActive("bulletList") ?? false,
          disabled: !isReady,
          icon: "•",
        },
        {
          label: "Numbered",
          action: () => editor?.chain().focus().toggleOrderedList().run(),
          active: editor?.isActive("orderedList") ?? false,
          disabled: !isReady,
          icon: "1.",
        },
        {
          label: "Task List",
          action: () => editor?.chain().focus().toggleTaskList().run(),
          active: editor?.isActive("taskList") ?? false,
          disabled: !isReady,
          icon: "☑",
        },
        {
          label: "Code Block",
          action: () => editor?.chain().focus().toggleCodeBlock().run(),
          active: editor?.isActive("codeBlock") ?? false,
          disabled: !isReady,
          icon: "</>",
        },
        {
          label: "Quote",
          action: () => editor?.chain().focus().toggleBlockquote().run(),
          active: editor?.isActive("blockquote") ?? false,
          disabled: !isReady,
          icon: "❝",
        },
      ],
    },
  ];

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-[hsl(var(--sb-border))] overflow-x-auto bg-[#0a0a0a] sticky top-0 z-10 custom-scrollbar">
      {groups.map((group, gi) => (
        <div key={group.label} className="flex items-center gap-2">
          {gi > 0 && (
            <Separator
              orientation="vertical"
              className="mx-3 h-5 bg-[hsl(var(--sb-border))]"
            />
          )}
          {group.items.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <button
                  onClick={item.action}
                  disabled={item.disabled}
                  aria-pressed={item.active}
                  className={`
                    px-2.5 py-1.5 rounded text-sm font-bold transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--sb-accent))]
                    ${item.active ? "bg-[hsl(var(--sb-accent))]/20 text-[hsl(var(--sb-accent))] border border-[hsl(var(--sb-accent))]/30" : "bg-transparent text-white/70 hover:bg-white/10 hover:text-white border border-transparent"}
                    ${item.disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {item.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-[#1a1a1a] text-white border-[hsl(var(--sb-border))]"
              >
                <div className="flex flex-col items-center">
                  <span>{item.label}</span>
                  {"shortcut" in item && (
                    <kbd className="text-[10px] opacity-80 bg-black/50 border border-white/10 px-1 rounded mt-1">
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      ))}
    </div>
  );
}
