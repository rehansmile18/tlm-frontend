"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { auditLogsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useDateFormat } from "@/lib/date-format";
import { useTranslation } from "@/lib/i18n/i18n";
import type { AuditLog } from "@/lib/types";

const PAGE_SIZE = 30;

const ENTITY_LABEL_KEY = {
  policy: "auditLogs.policy",
  ruleGroup: "auditLogs.ruleGroup",
  assignment: "auditLogs.assignment",
} as const;

export default function AuditLogsPage() {
  const { formatDateTime } = useDateFormat();
  const { t } = useTranslation();
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const params = { entityType: entityType || undefined, entityId: entityId || undefined, page, pageSize: PAGE_SIZE };
  const query = useQuery({
    queryKey: queryKeys.auditLogs(params),
    queryFn: () => auditLogsApi.list(params),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title={t("auditLogs.title")} description={t("auditLogs.description")} />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
          <Combobox
            aria-label={t("auditLogs.filterByEntityType")}
            value={entityType}
            onValueChange={(value) => {
              setEntityType(value);
              setPage(1);
            }}
          >
            <ComboboxItem value="">{t("auditLogs.allEntities")}</ComboboxItem>
            <ComboboxItem value="policy">{t("auditLogs.policy")}</ComboboxItem>
            <ComboboxItem value="ruleGroup">{t("auditLogs.ruleGroup")}</ComboboxItem>
            <ComboboxItem value="assignment">{t("auditLogs.assignment")}</ComboboxItem>
          </Combobox>
          <Input
            placeholder={t("auditLogs.filterByEntityId")}
            value={entityId}
            onChange={(e) => {
              setEntityId(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={t("auditLogs.noneFound")} description={t("auditLogs.noneMatch")} />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("auditLogs.colWhen")}</TableHead>
                  <TableHead>{t("auditLogs.colEntity")}</TableHead>
                  <TableHead>{t("auditLogs.colAction")}</TableHead>
                  <TableHead>{t("auditLogs.colEntityId")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => (
                  <TableRow key={log._id} className="cursor-pointer" onClick={() => setSelected(log)}>
                    <TableCell className="text-muted-foreground">{formatDateTime(log.timestamp)}</TableCell>
                    <TableCell className="capitalize">{t(ENTITY_LABEL_KEY[log.entityType])}</TableCell>
                    <TableCell>
                      <StatusBadge tone="info">{log.action}</StatusBadge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{log.entityId.slice(0, 12)}…</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("common.pageOfTotal", { page, totalPages, total })}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t("common.previous")}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              {t("common.next")}
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selected?.action} · {selected ? t(ENTITY_LABEL_KEY[selected.entityType]) : ""}
            </DialogTitle>
            <DialogDescription>{selected ? formatDateTime(selected.timestamp) : ""}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t("auditLogs.before")}</p>
              <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-2 text-xs">
                {selected?.before ? JSON.stringify(selected.before, null, 2) : "—"}
              </pre>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t("auditLogs.after")}</p>
              <pre className="max-h-72 overflow-auto rounded-md border bg-muted/40 p-2 text-xs">
                {selected?.after ? JSON.stringify(selected.after, null, 2) : "—"}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
