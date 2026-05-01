"use client";

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./components/ui/tooltip";

// Deterministic color from userId so same user always has same color
const AVATAR_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
];

export function getCursorColor(userId: string): string {
  const hash = [...userId].reduce((n, c) => n + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] as string;
}

interface UserAvatarProps {
  name: string;
  userId: string;
  size?: "sm" | "md";
  showTooltip?: boolean;
}

export function UserAvatar({
  name,
  userId,
  size = "md",
  showTooltip = true,
}: UserAvatarProps) {
  const color = getCursorColor(userId);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sizeClass = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";

  const avatar = (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white select-none`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );

  if (!showTooltip) return avatar;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent side="bottom">{name}</TooltipContent>
    </Tooltip>
  );
}
