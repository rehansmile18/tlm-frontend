"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2Icon,
  FileTextIcon,
  Layers3Icon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  TargetIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/policies", label: "Policies", icon: FileTextIcon },
  { href: "/rule-groups", label: "Rule Groups", icon: Layers3Icon },
  { href: "/assignments", label: "Assignments", icon: TargetIcon },
  { href: "/resolve", label: "Resolve", icon: ShieldCheckIcon },
  { href: "/clients", label: "Clients", icon: Building2Icon, roles: ["PLATFORM_ADMIN"] },
  { href: "/users", label: "Users", icon: UsersIcon, roles: ["PLATFORM_ADMIN", "CLIENT_ADMIN"] },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollTextIcon, roles: ["PLATFORM_ADMIN"] },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role } = useRole();
  const items = NAV.filter((item) => !item.roles || (role && item.roles.includes(role)));

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheckIcon className="size-4.5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">TLM Rules</span>
        <span className="text-[11px] text-muted-foreground">Rule Repository</span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center border-b px-5">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav />
      </div>
    </aside>
  );
}
