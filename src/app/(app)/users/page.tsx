"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usersApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useClients } from "@/lib/hooks";
import { useTranslation } from "@/lib/i18n/i18n";

export default function UsersPage() {
  const clients = useClients();
  const { t } = useTranslation();
  const query = useQuery({ queryKey: queryKeys.users({ pageSize: 200 }), queryFn: () => usersApi.list({ pageSize: 200 }) });

  const clientName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients.data?.items ?? []) map.set(c._id, c.name);
    return map;
  }, [clients.data]);

  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader
        title={t("users.title")}
        description={t("users.description")}
        actions={
          <Button nativeButton={false} render={<Link href="/users/new" />}>
            <PlusIcon className="size-4" />
            {t("users.newUser")}
          </Button>
        }
      />

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={t("users.noneFound")} />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.colEmail")}</TableHead>
                  <TableHead>{t("users.colRole")}</TableHead>
                  <TableHead>{t("users.colClient")}</TableHead>
                  <TableHead>{t("users.colStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u) => (
                  <TableRow key={u._id ?? u.email}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{t(`roles.${u.role}`)}</TableCell>
                    <TableCell className="text-muted-foreground">{u.clientId ? clientName.get(u.clientId) ?? "—" : t("users.allPlatform")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.status === "disabled" ? t("userStatus.disabled") : t("userStatus.active")}
                    </TableCell>
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
