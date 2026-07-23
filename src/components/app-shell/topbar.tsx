"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, MenuIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useMyProfile } from "@/lib/hooks";
import { useTranslation } from "@/lib/i18n/i18n";
import { initialsFromEmail } from "@/lib/avatar";
import { UserAvatar } from "@/components/user-avatar";
import { Brand, SidebarNav } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";

export function Topbar() {
  const { user, logout } = useAuth();
  const { data: profile } = useMyProfile();
  const { t, dir } = useTranslation();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const roleLabel = user ? t(`roles.${user.role}`) : "";
  // The mobile nav drawer should slide in from the reading-start edge — right in RTL, left in LTR.
  const mobileNavSide = dir === "rtl" ? "right" : "left";

  return (
    <header className="flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("nav.openMenu")} onClick={() => setMobileOpen(true)}>
        <MenuIcon className="size-5" />
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side={mobileNavSide} className="w-64 p-0">
          <SheetHeader className="h-16 justify-center border-b px-5">
            <SheetTitle className="p-0">
              <Brand />
            </SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <LanguageSwitcher />
      <ThemeToggle />

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-auto gap-2 py-1.5" />}>
            <UserAvatar avatarUrl={profile?.avatarUrl} initials={initialsFromEmail(user.email)} />
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="text-sm font-medium">{user.email}</span>
              <span className="text-[11px] text-muted-foreground">{roleLabel}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{user.email}</span>
                <span className="text-xs font-normal text-muted-foreground">{roleLabel}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <UserIcon className="size-4" />
              {t("nav.profile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout}>
              <LogOutIcon className="size-4" />
              {t("common.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  );
}
