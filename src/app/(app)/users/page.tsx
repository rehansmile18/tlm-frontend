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
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, humanizeError } from "@/components/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usersApi, type CreateUserBody } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useClients } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { humanizeRole } from "@/lib/format";
import type { UserRole } from "@/lib/types";

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { isPlatformAdmin, clientId: ownClientId } = useRole();
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
      toast.success("User created");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
      setEmail("");
      setPassword("");
    },
    onError: (error) => toast.error("Couldn't create user", { description: humanizeError(error) }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>Create an account and assign a role.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return toast.error("Email is required");
            if (password.length < 8) return toast.error("Password must be at least 8 characters");
            if (needsClient && !clientId) return toast.error("Select a client");
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="userEmail">Email</Label>
            <Input id="userEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="userPassword">Password</Label>
            <Input id="userPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="userRole">Role</Label>
            <NativeSelect id="userRole" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {humanizeRole(r)}
                </option>
              ))}
            </NativeSelect>
          </div>
          {needsClient && isPlatformAdmin ? (
            <div className="space-y-1.5">
              <Label htmlFor="userClient">Client</Label>
              <NativeSelect id="userClient" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="" disabled>
                  Select a client…
                </option>
                {clients.data?.items.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Create user
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
        title="Users"
        description="Accounts with access to the rule repository, scoped by role and client."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon className="size-4" />
            New user
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
        <EmptyState title="No users found" />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u) => (
                  <TableRow key={u._id ?? u.email}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{humanizeRole(u.role)}</TableCell>
                    <TableCell className="text-muted-foreground">{u.clientId ? clientName.get(u.clientId) ?? "—" : "All (platform)"}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{u.status ?? "active"}</TableCell>
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
