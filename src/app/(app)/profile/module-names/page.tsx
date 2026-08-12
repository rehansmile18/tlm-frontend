"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, humanizeError } from "@/components/data-state";
import { clientsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useAuth, useRole } from "@/lib/auth";
import { useMyClient } from "@/lib/hooks";
import { LOCALES, resolveInLocale, useTranslation, type Locale } from "@/lib/i18n/i18n";
import { MODULE_REGISTRY } from "@/lib/module-registry";
import type { ModuleLabelOverrides } from "@/lib/types";

interface LocaleLabels {
  singular: string;
  plural: string;
}
type FormValues = Record<string, Record<Locale, LocaleLabels>>;

/** Built-in default (singular/plural) for a module in an explicit locale — the pre-fill/reset value. */
function defaultsFor(moduleKey: string, locale: Locale): LocaleLabels {
  const moduleDef = MODULE_REGISTRY.find((m) => m.key === moduleKey)!;
  return {
    singular: resolveInLocale(locale, moduleDef.singularKey),
    plural: resolveInLocale(locale, moduleDef.pluralKey),
  };
}

function buildDefaultValues(source: ModuleLabelOverrides | null | undefined): FormValues {
  const values = {} as FormValues;
  for (const moduleDef of MODULE_REGISTRY) {
    values[moduleDef.key] = {
      en: source?.[moduleDef.key]?.en ?? defaultsFor(moduleDef.key, "en"),
      es: source?.[moduleDef.key]?.es ?? defaultsFor(moduleDef.key, "es"),
      ar: source?.[moduleDef.key]?.ar ?? defaultsFor(moduleDef.key, "ar"),
    };
  }
  return values;
}

function ModuleNamesForm({
  source,
  onSave,
  isSaving,
}: {
  source: ModuleLabelOverrides | null | undefined;
  onSave: (values: ModuleLabelOverrides) => void;
  isSaving: boolean;
}) {
  const { t, locale: uiLocale } = useTranslation();
  const [values, setValues] = useState<FormValues>(() => buildDefaultValues(source));

  function setField(moduleKey: string, locale: Locale, field: keyof LocaleLabels, value: string) {
    setValues((prev) => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [locale]: { ...prev[moduleKey][locale], [field]: value } },
    }));
  }

  function resetField(moduleKey: string, locale: Locale) {
    setValues((prev) => ({ ...prev, [moduleKey]: { ...prev[moduleKey], [locale]: defaultsFor(moduleKey, locale) } }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    for (const moduleDef of MODULE_REGISTRY) {
      for (const code of LOCALES) {
        const entry = values[moduleDef.key][code];
        if (!entry.singular.trim() || !entry.plural.trim()) {
          toast.error(t("moduleNames.fieldRequired"));
          return;
        }
      }
    }
    onSave(values as unknown as ModuleLabelOverrides);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Tabs defaultValue={uiLocale}>
        <TabsList>
          {LOCALES.map((code) => (
            <TabsTrigger key={code} value={code}>
              {t(`language.${code}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {LOCALES.map((code) => (
          <TabsContent key={code} value={code} className="space-y-3 pt-4">
            {MODULE_REGISTRY.map((moduleDef) => (
              <Card key={moduleDef.key}>
                <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                  <div className="sm:col-span-3 text-sm font-medium text-muted-foreground">
                    {resolveInLocale(code, moduleDef.pluralKey)}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${moduleDef.key}-${code}-singular`}>{t("moduleNames.singular")}</Label>
                    <Input
                      id={`${moduleDef.key}-${code}-singular`}
                      value={values[moduleDef.key][code].singular}
                      onChange={(e) => setField(moduleDef.key, code, "singular", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${moduleDef.key}-${code}-plural`}>{t("moduleNames.plural")}</Label>
                    <Input
                      id={`${moduleDef.key}-${code}-plural`}
                      value={values[moduleDef.key][code].plural}
                      onChange={(e) => setField(moduleDef.key, code, "plural", e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => resetField(moduleDef.key, code)}
                  >
                    <RotateCcwIcon className="size-3.5" />
                    {t("moduleNames.resetToDefault")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {t("common.saveChanges")}
      </Button>
    </form>
  );
}

export default function ModuleNamesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isClientAdmin, isPlatformAdmin } = useRole();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState("");

  useEffect(() => {
    if (user && !isClientAdmin && !isPlatformAdmin) router.replace("/profile");
  }, [user, isClientAdmin, isPlatformAdmin, router]);

  const myClientQuery = useMyClient();
  const clientsQuery = useQuery({
    queryKey: queryKeys.clients,
    queryFn: () => clientsApi.list(),
    enabled: isPlatformAdmin,
  });

  const selectedClient = clientsQuery.data?.items.find((c) => c._id === selectedClientId);
  const source = isClientAdmin ? myClientQuery.data?.client?.moduleLabels : selectedClient?.moduleLabels;

  const mutation = useMutation({
    mutationFn: (moduleLabels: ModuleLabelOverrides) => {
      if (isClientAdmin) return clientsApi.updateMine({ moduleLabels });
      return clientsApi.update(selectedClientId, { moduleLabels });
    },
    onSuccess: (updated) => {
      toast.success(t("moduleNames.saved"));
      if (isClientAdmin) {
        queryClient.setQueryData(queryKeys.myClient, { client: updated });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      }
    },
    onError: (error) => {
      toast.error(t("moduleNames.couldntSave"), { description: humanizeError(error) });
    },
  });

  const backLink = (
    <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeftIcon className="size-4" />
      {t("moduleNames.backToProfile")}
    </Link>
  );

  if (!user || (!isClientAdmin && !isPlatformAdmin)) {
    return null;
  }

  return (
    <>
      {backLink}
      <PageHeader title={t("moduleNames.title")} description={t("moduleNames.description")} />

      {isPlatformAdmin ? (
        <Card>
          <CardContent className="space-y-1.5">
            <Label htmlFor="clientPicker">{t("moduleNames.selectClient")}</Label>
            {clientsQuery.isLoading ? (
              <Skeleton className="h-9 w-64" />
            ) : clientsQuery.isError ? (
              <p className="text-sm text-destructive">{t("moduleNames.couldntLoadClients")}</p>
            ) : (
              <Combobox
                id="clientPicker"
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                placeholder={t("moduleNames.selectClientPlaceholder")}
              >
                {(clientsQuery.data?.items ?? []).map((client) => (
                  <ComboboxItem key={client._id} value={client._id}>
                    {client.name}
                  </ComboboxItem>
                ))}
              </Combobox>
            )}
          </CardContent>
        </Card>
      ) : null}

      {isPlatformAdmin && !selectedClientId ? (
        <EmptyState title={t("moduleNames.noClientSelected")} />
      ) : isClientAdmin && myClientQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <ModuleNamesForm
          key={selectedClientId || "me"}
          source={source}
          onSave={(values) => mutation.mutate(values)}
          isSaving={mutation.isPending}
        />
      )}
    </>
  );
}
