"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { humanizeError } from "@/components/data-state";
import { usersApi, type CreateUserBody } from "@/lib/resources";
import { useClients } from "@/lib/hooks";
import { useRole } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n/i18n";
import type { UserRole } from "@/lib/types";

export function UserForm({ onDone }: { onDone: () => void }) {
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
      onDone();
    },
    onError: (error) => toast.error(t("users.couldntCreate"), { description: humanizeError(error) }),
  });

  return (
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
      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {t("users.createUser")}
        </Button>
      </div>
    </form>
  );
}
