"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { clientsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useCountries } from "@/lib/hooks";
import { useDateFormat } from "@/lib/date-format";
import { useTranslation } from "@/lib/i18n/i18n";

export default function ClientsPage() {
  const query = useQuery({ queryKey: queryKeys.clients, queryFn: () => clientsApi.list() });
  const countries = useCountries();
  const { formatDate } = useDateFormat();
  const { t } = useTranslation();
  const items = query.data?.items ?? [];

  const countryName = (isoCode: string | null) =>
    isoCode ? (countries.data?.items.find((c) => c.isoCode === isoCode)?.name ?? isoCode) : t("clients.allCountriesLabel");

  return (
    <>
      <PageHeader
        title={t("clients.title")}
        description={t("clients.description")}
        actions={
          <Button nativeButton={false} render={<Link href="/clients/new" />}>
            <PlusIcon className="size-4" />
            {t("clients.newClient")}
          </Button>
        }
      />

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={t("clients.noneFound")}
          action={
            <Button nativeButton={false} render={<Link href="/clients/new" />}>
              <PlusIcon className="size-4" />
              {t("clients.newClient")}
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("clients.colName")}</TableHead>
                  <TableHead>{t("clients.colStatus")}</TableHead>
                  <TableHead>{t("clients.colCountry")}</TableHead>
                  <TableHead>{t("clients.colStates")}</TableHead>
                  <TableHead>{t("clients.colDateFormat")}</TableHead>
                  <TableHead>{t("clients.colCreated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <StatusBadge tone={c.status === "active" ? "success" : "muted"}>
                        {c.status === "active" ? t("clientStatus.active") : t("clientStatus.suspended")}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{countryName(c.country)}</TableCell>
                    <TableCell className="text-muted-foreground">{c.enabledStates.join(", ") || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.calendarFormat}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </>
  );
}
