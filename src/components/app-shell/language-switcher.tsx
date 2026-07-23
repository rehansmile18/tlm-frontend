"use client";

import { CheckIcon, ChevronDownIcon, LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, useTranslation, type Locale } from "@/lib/i18n/i18n";

// Shown in the trigger regardless of the active UI language, so the control is
// self-labeling at a glance instead of relying on a bare, ambiguous icon.
const LOCALE_CODE: Record<Locale, string> = { en: "EN", es: "ES", ar: "AR" };

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5" aria-label={t("language.label")} />
        }
      >
        <LanguagesIcon className="size-4 text-muted-foreground" />
        <span className="text-xs font-semibold tracking-wide">{LOCALE_CODE[locale]}</span>
        <ChevronDownIcon className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
          {LOCALES.map((code: Locale) => {
            const active = locale === code;
            return (
              <DropdownMenuItem
                key={code}
                onClick={() => setLocale(code)}
                className={`justify-between gap-3 py-2 ${active ? "bg-accent" : ""}`}
              >
                <span className="flex flex-col">
                  <span className={`text-sm ${active ? "font-semibold" : "font-medium"}`}>{t(`language.${code}`)}</span>
                  <span className="text-xs text-muted-foreground">{LOCALE_CODE[code]}</span>
                </span>
                {active ? <CheckIcon className="size-4 shrink-0 text-primary" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
