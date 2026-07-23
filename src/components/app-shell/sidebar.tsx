"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
import { useTranslation, type TranslationKey } from "@/lib/i18n/i18n";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UserRole } from "@/lib/types";

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  roles?: UserRole[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboardIcon },
  { href: "/policies", labelKey: "nav.policies", icon: FileTextIcon },
  { href: "/rule-groups", labelKey: "nav.ruleGroups", icon: Layers3Icon },
  { href: "/assignments", labelKey: "nav.assignments", icon: TargetIcon },
  { href: "/resolve", labelKey: "nav.resolve", icon: ShieldCheckIcon },
  { href: "/clients", labelKey: "nav.clients", icon: Building2Icon, roles: ["PLATFORM_ADMIN"] },
  { href: "/users", labelKey: "nav.users", icon: UsersIcon, roles: ["PLATFORM_ADMIN", "CLIENT_ADMIN"] },
  { href: "/audit-logs", labelKey: "nav.auditLogs", icon: ScrollTextIcon, roles: ["PLATFORM_ADMIN"] },
];

const SIDEBAR_COLLAPSED_KEY = "tlm.sidebar.collapsed";
const sidebarListeners = new Set<() => void>();

function getSidebarSnapshot(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

function getSidebarServerSnapshot(): boolean {
  return false;
}

function subscribeSidebar(listener: () => void): () => void {
  sidebarListeners.add(listener);
  return () => sidebarListeners.delete(listener);
}

function setSidebarCollapsedPersisted(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
  for (const listener of sidebarListeners) listener();
}

/** Persists the collapsed state in localStorage via useSyncExternalStore — hydration-safe by
 * construction (React reconciles the server/client snapshot mismatch itself), no effects needed. */
function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribeSidebar, getSidebarSnapshot, getSidebarServerSnapshot);
  const setCollapsed = (next: boolean | ((prev: boolean) => boolean)) =>
    setSidebarCollapsedPersisted(typeof next === "function" ? next(getSidebarSnapshot()) : next);
  return [collapsed, setCollapsed] as const;
}

export function SidebarNav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const { role } = useRole();
  const { t } = useTranslation();
  const items = NAV.filter((item) => !item.roles || (role && item.roles.includes(role)));

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const label = t(item.labelKey);
        const link = (
          <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              collapsed && "justify-center px-0",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed ? label : null}
          </Link>
        );
        if (!collapsed) return <div key={item.href}>{link}</div>;
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger render={link} />
            <TooltipContent side="inline-end">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ShieldCheckIcon className="size-4.5" />
      </span>
      {!collapsed ? (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">TLM Rules</span>
          <span className="text-[11px] text-muted-foreground">Rule Repository</span>
        </span>
      ) : null}
    </Link>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const { t, dir } = useTranslation();

  // The chevron always points in the direction the panel is about to grow toward — which
  // direction that visually is flips with dir, since the sidebar itself sits on the opposite
  // physical edge in RTL (right) vs LTR (left).
  const willExpandIcon = dir === "rtl" ? ChevronLeftIcon : ChevronRightIcon;
  const willCollapseIcon = dir === "rtl" ? ChevronRightIcon : ChevronLeftIcon;
  const ToggleIcon = collapsed ? willExpandIcon : willCollapseIcon;

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 flex-col border-e bg-card transition-[width] duration-150 md:flex",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className={cn("flex h-16 items-center border-b", collapsed ? "justify-center px-2" : "px-5")}>
        <Brand collapsed={collapsed} />
      </div>
      <div className={cn("flex-1 overflow-y-auto overflow-x-hidden p-3", collapsed && "px-2")}>
        <SidebarNav collapsed={collapsed} />
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
        className="absolute -end-3 top-16 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
      >
        <ToggleIcon className="size-3.5" />
      </button>
    </aside>
  );
}
