"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, humanizeError } from "@/components/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { clientsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { formatDate } from "@/lib/format";

function CreateClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [statesText, setStatesText] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      clientsApi.create({
        name,
        enabledStates: statesText
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("Client created");
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      onOpenChange(false);
      setName("");
      setStatesText("");
    },
    onError: (error) => toast.error("Couldn't create client", { description: humanizeError(error) }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
          <DialogDescription>Create a tenant and the states it operates in.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return toast.error("Name is required");
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="clientName">Name</Label>
            <Input id="clientName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Retail" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clientStates">Enabled states</Label>
            <Input id="clientStates" value={statesText} onChange={(e) => setStatesText(e.target.value)} placeholder="CA, TX, NY" />
            <p className="text-xs text-muted-foreground">Two-letter codes, comma-separated.</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Create client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const query = useQuery({ queryKey: queryKeys.clients, queryFn: () => clientsApi.list() });
  const items = query.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Clients"
        description="Tenants of the rule repository. Each owns its policies, rule groups, and assignments."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon className="size-4" />
            New client
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
        <EmptyState title="No clients yet" action={<Button onClick={() => setDialogOpen(true)}><PlusIcon className="size-4" />New client</Button>} />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enabled states</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <StatusBadge tone={c.status === "active" ? "success" : "muted"}>{c.status}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.enabledStates.join(", ") || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <CreateClientDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
