"use client";
import type { Editor } from "@tiptap/react";
import { Tooltip, TooltipContent, TooltipTrigger, Separator } from "@repo/ui";
import { useUndoManager } from "./hooks/useUndoManager";
import { useSyncManager } from "@/lib/sync/SyncContext";

interface ToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: ToolbarProps) {
  const manager = useSyncManager();
  const { undo, redo, canUndo, canRedo } = useUndoManager(manager.doc);

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
          action: () => editor.chain().focus().toggleBold().run(),
          active: editor.isActive("bold"),
          disabled: false,
          icon: "B",
        },
        {
          label: "Italic",
          shortcut: "⌘I",
          action: () => editor.chain().focus().toggleItalic().run(),
          active: editor.isActive("italic"),
          disabled: false,
          icon: "I",
        },
        {
          label: "Strike",
          shortcut: "⌘⇧S",
          action: () => editor.chain().focus().toggleStrike().run(),
          active: editor.isActive("strike"),
          disabled: false,
          icon: "S̶",
        },
        {
          label: "Code",
          shortcut: "⌘E",
          action: () => editor.chain().focus().toggleCode().run(),
          active: editor.isActive("code"),
          disabled: false,
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
            editor.chain().focus().toggleHeading({ level: 1 }).run(),
          active: editor.isActive("heading", { level: 1 }),
          disabled: false,
          icon: "H1",
        },
        {
          label: "H2",
          action: () =>
            editor.chain().focus().toggleHeading({ level: 2 }).run(),
          active: editor.isActive("heading", { level: 2 }),
          disabled: false,
          icon: "H2",
        },
        {
          label: "Bullet List",
          action: () => editor.chain().focus().toggleBulletList().run(),
          active: editor.isActive("bulletList"),
          disabled: false,
          icon: "•",
        },
        {
          label: "Numbered",
          action: () => editor.chain().focus().toggleOrderedList().run(),
          active: editor.isActive("orderedList"),
          disabled: false,
          icon: "1.",
        },
        {
          label: "Task List",
          action: () => editor.chain().focus().toggleTaskList().run(),
          active: editor.isActive("taskList"),
          disabled: false,
          icon: "☑",
        },
        {
          label: "Code Block",
          action: () => editor.chain().focus().toggleCodeBlock().run(),
          active: editor.isActive("codeBlock"),
          disabled: false,
          icon: "</>",
        },
        {
          label: "Quote",
          action: () => editor.chain().focus().toggleBlockquote().run(),
          active: editor.isActive("blockquote"),
          disabled: false,
          icon: "❝",
        },
      ],
    },
  ];

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto bg-background sticky top-0 z-10">
      {groups.map((group, gi) => (
        <div key={group.label} className="flex items-center gap-0.5">
          {gi > 0 && <Separator orientation="vertical" className="mx-1 h-5" />}
          {group.items.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <button
                  onClick={item.action}
                  disabled={item.disabled}
                  aria-pressed={item.active}
                  className={`
                    px-2 py-1 rounded text-sm font-medium transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand
                    ${item.active ? "bg-foreground text-background" : "text-foreground/70 hover:bg-muted hover:text-foreground"}
                    ${item.disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                  `}
                >
                  {item.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="flex flex-col items-center">
                  <span>{item.label}</span>
                  {"shortcut" in item && (
                    <kbd className="text-[10px] opacity-60 bg-muted px-1 rounded mt-1">
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
