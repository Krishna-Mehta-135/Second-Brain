"use client";

import { useUser } from "@/lib/auth/useAuth";
import { logoutAction } from "@/lib/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  UserAvatar,
} from "@repo/ui";

export function SidebarHeader() {
  const user = useUser();

  return (
    <div className="flex items-center justify-between h-12 px-3 border-b border-border">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-brand flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">SB</span>
        </div>
        <span className="font-semibold text-sm">Second Brain</span>
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <UserAvatar
              name={user.name}
              userId={user.id}
              size="sm"
              showTooltip={false}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => logoutAction()}
            className="text-red-600 focus:text-red-600"
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
