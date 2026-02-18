"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Receipt,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/spese", label: "Spese", icon: Receipt },
  { href: "/reporting", label: "Reporting", icon: BarChart3 },
  { href: "/configurazione", label: "Configurazione", icon: Settings },
] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo / Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-700 px-4">
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 overflow-hidden transition-all",
            collapsed ? "w-10 justify-center" : "w-full"
          )}
        >
          <BookOpen className="h-6 w-6 shrink-0 text-blue-400" />
          {!collapsed && (
            <span className="truncate font-semibold">Ledgera</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/20 text-blue-300"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Collapse toggle for mobile - shown at bottom when collapsed on desktop */}
      <div className="hidden border-t border-slate-700 p-2 lg:block">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "w-full text-slate-400 hover:bg-slate-800 hover:text-white",
            collapsed && "justify-center"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              {!collapsed && (
                <span className="ml-2 text-xs">Comprimi</span>
              )}
            </>
          )}
        </Button>
      </div>

      {/* Version */}
      <div
        className={cn(
          "border-t border-slate-700 px-4 py-3 text-xs text-slate-500",
          collapsed ? "text-center" : ""
        )}
      >
        v0.1.0
      </div>
    </nav>
  );
}
