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
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, humanizeError } from "@/components/data-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { clientsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useCountries, useStatesForCountry } from "@/lib/hooks";
import { useDateFormat } from "@/lib/date-format";
import { useTranslation } from "@/lib/i18n/i18n";
import { CALENDAR_FORMATS } from "@/lib/types";

const ALL_COUNTRIES_VALUE = "";

function CreateClientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const countries = useCountries();

  const [name, setName] = useState("");
  const [country, setCountry] = useState(ALL_COUNTRIES_VALUE);
  const [enabledStates, setEnabledStates] = useState<string[]>([]);
  const [calendarFormat, setCalendarFormat] = useState<(typeof CALENDAR_FORMATS)[number]>("MM/DD/YYYY");

  const states = useStatesForCountry(country || null);

  // Switching country invalidates any previously-picked states from the old country. Adjusted
  // during render (React's recommended pattern for resetting state on a prop/value change)
  // rather than in an effect, which would cost an extra render and trip set-state-in-effect.
  const [statesResetForCountry, setStatesResetForCountry] = useState(country);
  if (country !== statesResetForCountry) {
    setStatesResetForCountry(country);
    setEnabledStates([]);
  }

  const mutation = useMutation({
    mutationFn: () =>
      clientsApi.create({
        name,
        country: country || null,
        enabledStates: country ? enabledStates : [],
        calendarFormat,
      }),
    onSuccess: () => {
      toast.success(t("clients.toastCreated"));
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      onOpenChange(false);
      setName("");
      setCountry(ALL_COUNTRIES_VALUE);
      setEnabledStates([]);
      setCalendarFormat("MM/DD/YYYY");
    },
    onError: (error) => toast.error(t("clients.couldntCreate"), { description: humanizeError(error) }),
  });

  function toggleState(isoCode: string) {
    setEnabledStates((prev) => (prev.includes(isoCode) ? prev.filter((s) => s !== isoCode) : [...prev, isoCode]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("clients.newDialogTitle")}</DialogTitle>
          <DialogDescription>{t("clients.newDialogDescription")}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return toast.error(t("common.nameRequired"));
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="clientName">{t("clients.name")}</Label>
            <Input id="clientName" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("clients.namePlaceholder")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clientCountry">{t("clients.country")}</Label>
            <Combobox id="clientCountry" value={country} onValueChange={setCountry}>
              <ComboboxItem value={ALL_COUNTRIES_VALUE}>{t("clients.allCountries")}</ComboboxItem>
              {countries.data?.items.map((c) => (
                <ComboboxItem key={c.isoCode} value={c.isoCode}>
                  {c.name}
                </ComboboxItem>
              ))}
            </Combobox>
            <p className="text-xs text-muted-foreground">{country ? t("clients.pickStatesHint") : t("clients.noSingleCountryHint")}</p>
          </div>

          {country ? (
            <div className="space-y-1.5">
              <Label>{t("clients.statesProvinces")}</Label>
              {states.isLoading ? (
                <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
              ) : states.data && states.data.items.length > 0 ? (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {states.data.items.map((s) => (
                    <label key={s.isoCode} htmlFor={`state-${s.isoCode}`} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                      <input
                        id={`state-${s.isoCode}`}
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={enabledStates.includes(s.isoCode)}
                        onChange={() => toggleState(s.isoCode)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("clients.noSubdivisions")}</p>
              )}
              {enabledStates.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {enabledStates.length} {t("clients.selected")}: {enabledStates.join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="clientCalendarFormat">{t("clients.dateFormat")}</Label>
            <Combobox
              id="clientCalendarFormat"
              value={calendarFormat}
              onValueChange={(v) => setCalendarFormat(v as (typeof CALENDAR_FORMATS)[number])}
            >
              {CALENDAR_FORMATS.map((f) => (
                <ComboboxItem key={f} value={f}>
                  {f}
                </ComboboxItem>
              ))}
            </Combobox>
            <p className="text-xs text-muted-foreground">{t("clients.dateFormatHint")}</p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {t("clients.createClient")}
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
          <Button onClick={() => setDialogOpen(true)}>
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
            <Button onClick={() => setDialogOpen(true)}>
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

      <CreateClientDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
