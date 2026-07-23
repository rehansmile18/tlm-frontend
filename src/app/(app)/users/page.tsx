"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, humanizeError } from "@/components/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usersApi, type CreateUserBody } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useClients } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n/i18n";
import type { UserRole } from "@/lib/types";

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { isPlatformAdmin, clientId: ownClientId } = useRole();
  const { t } = useTranslation();
  const clients = useClients();
  const queryClient = useQueryClient();

  const roleOptions: UserRole[] = isPlatformAdmin ? ["PLATFORM_ADMIN", "CLIENT_ADMIN", "VIEWER"] : ["CLIENT_ADMIN", "VIEWER"];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(isPlatformAdmin ? "CLIENT_ADMIN" : "VIEWER");
  const [clientId, setClientId] = useState(ownClientId ?? "");

  const needsClient = role !== "PLATFORM_ADMIN";

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateUserBody = {
        email,
        password,
        role,
        clientId: needsClient ? clientId : undefined,
      };
      return usersApi.create(body);
    },
    onSuccess: () => {
      toast.success(t("users.toastCreated"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
      setEmail("");
      setPassword("");
    },
    onError: (error) => toast.error(t("users.couldntCreate"), { description: humanizeError(error) }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("users.newDialogTitle")}</DialogTitle>
          <DialogDescription>{t("users.newDialogDescription")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return toast.error(t("users.emailRequired"));
            if (password.length < 8) return toast.error(t("users.passwordMinLength"));
            if (needsClient && !clientId) return toast.error(t("common.selectClient"));
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="userEmail">{t("users.email")}</Label>
            <Input id="userEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="userPassword">{t("users.password")}</Label>
            <Input id="userPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("users.passwordHint")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="userRole">{t("users.role")}</Label>
            <Combobox id="userRole" value={role} onValueChange={(v) => setRole(v as UserRole)}>
              {roleOptions.map((r) => (
                <ComboboxItem key={r} value={r}>
                  {t(`roles.${r}`)}
                </ComboboxItem>
              ))}
            </Combobox>
          </div>
          {needsClient && isPlatformAdmin ? (
            <div className="space-y-1.5">
              <Label htmlFor="userClient">{t("users.client")}</Label>
              <Combobox id="userClient" value={clientId} onValueChange={setClientId} placeholder={t("users.selectClient")}>
                {clients.data?.items.map((c) => (
                  <ComboboxItem key={c._id} value={c._id}>
                    {c.name}
                  </ComboboxItem>
                ))}
              </Combobox>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {t("users.createUser")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
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
          <Button onClick={() => setDialogOpen(true)}>
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

      <CreateUserDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
