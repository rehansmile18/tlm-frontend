"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMyClient } from "./hooks";
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
 * Resolves the logged-in user's client's calendarFormat (via GET /clients/me) and makes
 * format-bound formatDate/formatDateTime available to the whole app, so every date renders in
 * the format that client chose — falling back to MM/DD/YYYY before the client loads, or for a
 * PLATFORM_ADMIN, who spans all clients and has no single format.
 */
export function DateFormatProvider({ children }: { children: ReactNode }) {
  const { data } = useMyClient();
  const calendarFormat = data?.client?.calendarFormat ?? DEFAULT_FORMAT;

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
