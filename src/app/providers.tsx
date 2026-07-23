"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth";
import { DateFormatProvider } from "@/lib/date-format";
import { I18nProvider } from "@/lib/i18n/i18n";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DateFormatProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </DateFormatProvider>
          </AuthProvider>
          <Toaster richColors closeButton position="top-center" />
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
