
"use client";

import { Bell, LogOut, UserCircle, Menu, ChevronDown, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { currentUser, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
           <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        )}
        {/* Optionally, add a title or breadcrumbs here */}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full relative">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
          {/* Placeholder for notification count badge */}
          {/* <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" /> */}
        </Button>

        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 rounded-full p-1.5 md:p-2">
                <UserCircle className="h-7 w-7 text-muted-foreground" />
                <span className="hidden md:inline text-sm font-medium text-foreground/80">
                  {currentUser.name || currentUser.email}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:inline" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-medium">{currentUser.name || "User"}</div>
                <div className="text-xs text-muted-foreground">{currentUser.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile"> {/* Placeholder, profile page not yet created */}
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/business">
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>Business Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
