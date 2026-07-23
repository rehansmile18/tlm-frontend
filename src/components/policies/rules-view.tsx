"use client";

import { humanizeKey } from "./rules-fields";
import { useTranslation } from "@/lib/i18n/i18n";

function RenderValue({ value, enumLabel }: { value: unknown; enumLabel: (raw: string) => string }) {
  const { t } = useTranslation();
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return <>{value ? t("common.yes") : t("common.no")}</>;
  if (typeof value === "number") return <>{value}</>;
  if (typeof value === "string") return <>{enumLabel(value)}</>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">{t("common.none")}</span>;
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-md border bg-background p-2">
            <RulesView value={item as Record<string, unknown>} />
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object") return <RulesView value={value as Record<string, unknown>} />;
  return <>{String(value)}</>;
}

export function RulesView({ value }: { value: Record<string, unknown> }) {
  const { tOptional } = useTranslation();
  const fieldLabel = (key: string) => tOptional(`ruleFields.${key}`) ?? humanizeKey(key);
  // Raw string values here may be a genuine enum (e.g. "premium_pay", "Sunday") or free-text data
  // entered by a user (e.g. minimumWageSource); tOptional is a safe no-op fallback for the latter.
  const enumLabel = (raw: string) => tOptional(`ruleEnums.${raw}`) ?? raw;

  const entries = Object.entries(value ?? {});
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {entries.map(([key, val]) => {
        const nested = val !== null && typeof val === "object";
        return (
          <div key={key} className={nested ? "space-y-1 sm:col-span-2" : "space-y-0.5"}>
            <dt className="text-xs text-muted-foreground">{fieldLabel(key)}</dt>
            <dd className="text-sm">
              <RenderValue value={val} enumLabel={enumLabel} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
