"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMyClient, useMyProfile } from "./hooks";
import { CALENDAR_FORMAT_PATTERNS, formatDate as formatDateWith, formatDateTime as formatDateTimeWith } from "./format";
import type { CalendarFormat } from "./types";

const DEFAULT_FORMAT: CalendarFormat = "MM/DD/YYYY";

interface DateFormatContextValue {
  calendarFormat: CalendarFormat;
  formatDate: (iso?: string | null) => string;
  formatDateTime: (iso?: string | null) => string;
}

const DateFormatContext = createContext<DateFormatContextValue | null>(null);

/**
 * Resolves the date format to render throughout the app, in priority order: the user's own
 * preferredDateFormat (set on the profile page) > their client's shared calendarFormat (via GET
 * /clients/me) > MM/DD/YYYY before either loads, or for a PLATFORM_ADMIN with no single client.
 */
export function DateFormatProvider({ children }: { children: ReactNode }) {
  const { data: clientData } = useMyClient();
  const { data: profileData } = useMyProfile();
  const calendarFormat = profileData?.preferredDateFormat ?? clientData?.client?.calendarFormat ?? DEFAULT_FORMAT;

  const value = useMemo<DateFormatContextValue>(() => {
    const pattern = CALENDAR_FORMAT_PATTERNS[calendarFormat];
    return {
      calendarFormat,
      formatDate: (iso) => formatDateWith(iso, pattern),
      formatDateTime: (iso) => formatDateTimeWith(iso, pattern),
    };
  }, [calendarFormat]);

  return <DateFormatContext.Provider value={value}>{children}</DateFormatContext.Provider>;
}

export function useDateFormat(): DateFormatContextValue {
  const ctx = useContext(DateFormatContext);
  if (!ctx) throw new Error("useDateFormat must be used within a DateFormatProvider");
  return ctx;
}
