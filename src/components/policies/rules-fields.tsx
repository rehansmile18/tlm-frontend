"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { useTranslation } from "@/lib/i18n/i18n";
import type { JsonSchema } from "@/lib/types";

type RulesValue = Record<string, unknown>;

function baseType(schema: JsonSchema): string {
  if (Array.isArray(schema.type)) return schema.type.find((t) => t !== "null") ?? "string";
  return schema.type ?? "string";
}

function isNullable(schema: JsonSchema): boolean {
  return Array.isArray(schema.type) && schema.type.includes("null");
}

export function defaultForSchema(schema: JsonSchema): unknown {
  if (schema.default !== undefined) return schema.default;
  switch (baseType(schema)) {
    case "boolean":
      return false;
    case "number":
      return isNullable(schema) ? null : 0;
    case "array":
      return [];
    case "object": {
      const obj: RulesValue = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) obj[key] = defaultForSchema(propSchema);
      }
      return obj;
    }
    default:
      return schema.enum ? schema.enum[0] : "";
  }
}

/** Mechanical fallback for a rule-field key that has no translation entry yet. */
export function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\bId\b/g, "ID")
    .trim();
}

/**
 * Normalizes a rules payload before submit: empty/blank number fields become null so the backend
 * doesn't receive "" (which fails Mongoose number casting). Recurses into nested objects and arrays.
 */
export function sanitizeRules(schema: JsonSchema, value: unknown): RulesValue {
  const properties = schema.properties ?? {};
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as RulesValue) : {};
  const out: RulesValue = { ...source };
  for (const [key, propSchema] of Object.entries(properties)) {
    const type = baseType(propSchema);
    const current = out[key];
    if (type === "number") {
      if (current === "" || current === undefined) out[key] = null;
    } else if (type === "object" && current && typeof current === "object") {
      out[key] = sanitizeRules(propSchema, current);
    } else if (type === "array" && Array.isArray(current) && propSchema.items) {
      out[key] = current.map((item) => sanitizeRules(propSchema.items as JsonSchema, item));
    }
  }
  return out;
}

/** Returns human-readable labels for required rule fields that are missing/blank. Empty = valid. */
export function collectRuleErrors(schema: JsonSchema, value: unknown, prefix = ""): string[] {
  const errors: string[] = [];
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const obj = value && typeof value === "object" && !Array.isArray(value) ? (value as RulesValue) : {};

  for (const [key, propSchema] of Object.entries(properties)) {
    const type = baseType(propSchema);
    const current = obj[key];
    const isRequired = required.has(key);
    const label = prefix ? `${prefix} → ${humanizeKey(key)}` : humanizeKey(key);

    if (type === "number") {
      const missing = current === "" || current === undefined || (current === null && !isNullable(propSchema)) || (typeof current === "number" && Number.isNaN(current));
      if (isRequired && missing) errors.push(label);
    } else if (type === "string") {
      if (isRequired && (current === undefined || current === null || String(current).trim() === "")) errors.push(label);
    } else if (type === "object") {
      errors.push(...collectRuleErrors(propSchema, current, label));
    } else if (type === "array") {
      if (isRequired && (!Array.isArray(current) || current.length === 0)) errors.push(label);
      if (Array.isArray(current) && propSchema.items) {
        current.forEach((item, index) => errors.push(...collectRuleErrors(propSchema.items as JsonSchema, item, `${label} #${index + 1}`)));
      }
    }
  }
  return errors;
}

function FieldRow({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function RulesFields({
  schema,
  value,
  onChange,
  path = "rules",
}: {
  schema: JsonSchema;
  value: RulesValue;
  onChange: (next: RulesValue) => void;
  path?: string;
}) {
  const { t, tOptional } = useTranslation();
  const fieldLabel = (key: string) => tOptional(`ruleFields.${key}`) ?? humanizeKey(key);
  const enumLabel = (raw: string) => tOptional(`ruleEnums.${raw}`) ?? raw;

  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const setKey = (key: string, next: unknown) => onChange({ ...value, [key]: next });

  return (
    <div className="space-y-4">
      {Object.entries(properties).map(([key, propSchema]) => {
        const type = baseType(propSchema);
        const id = `${path}.${key}`;
        const current = value[key];
        const label = fieldLabel(key);

        if (type === "boolean") {
          return (
            <label key={key} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                id={id}
                type="checkbox"
                className="size-4 accent-primary"
                checked={Boolean(current)}
                onChange={(e) => setKey(key, e.target.checked)}
              />
              {label}
            </label>
          );
        }

        if (type === "string" && propSchema.enum) {
          return (
            <FieldRow key={key} label={label} required={required.has(key)} htmlFor={id}>
              <Combobox id={id} value={current == null ? "" : String(current)} onValueChange={(value) => setKey(key, value)} placeholder={t("common.select")}>
                {propSchema.enum.map((opt) => (
                  <ComboboxItem key={String(opt)} value={String(opt)}>
                    {enumLabel(String(opt))}
                  </ComboboxItem>
                ))}
              </Combobox>
            </FieldRow>
          );
        }

        if (type === "number") {
          return (
            <FieldRow key={key} label={label} required={required.has(key)} htmlFor={id}>
              <Input
                id={id}
                type="number"
                inputMode="decimal"
                value={current == null ? "" : String(current)}
                onChange={(e) =>
                  setKey(key, e.target.value === "" ? (isNullable(propSchema) ? null : "") : Number(e.target.value))
                }
              />
            </FieldRow>
          );
        }

        if (type === "object") {
          const nested = current && typeof current === "object" && !Array.isArray(current) ? (current as RulesValue) : {};
          return (
            <fieldset key={key} className="space-y-3 rounded-lg border p-3">
              <legend className="px-1 text-xs font-medium text-muted-foreground">{label}</legend>
              <RulesFields schema={propSchema} value={nested} onChange={(nv) => setKey(key, nv)} path={id} />
            </fieldset>
          );
        }

        if (type === "array") {
          const arr = Array.isArray(current) ? (current as RulesValue[]) : [];
          const itemSchema: JsonSchema = propSchema.items ?? { type: "object", properties: {} };
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">
                  {label}
                  {required.has(key) ? <span className="text-destructive"> *</span> : null}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setKey(key, [...arr, defaultForSchema(itemSchema) as RulesValue])}
                >
                  <PlusIcon className="size-3.5" />
                  {t("common.add")}
                </Button>
              </div>
              {arr.length === 0 ? <p className="text-xs text-muted-foreground">{t("common.noEntriesYet")}</p> : null}
              <div className="space-y-2">
                {arr.map((item, index) => (
                  <div key={index} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("common.remove")}
                        onClick={() => setKey(key, arr.filter((_, i) => i !== index))}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                    <RulesFields
                      schema={itemSchema}
                      value={item && typeof item === "object" ? item : {}}
                      onChange={(nv) => {
                        const copy = [...arr];
                        copy[index] = nv;
                        setKey(key, copy);
                      }}
                      path={`${id}.${index}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <FieldRow key={key} label={label} required={required.has(key)} htmlFor={id}>
            <Input
              id={id}
              value={current == null ? "" : String(current)}
              placeholder={propSchema.pattern ? "HH:MM" : undefined}
              onChange={(e) => setKey(key, e.target.value)}
            />
          </FieldRow>
        );
      })}
    </div>
  );
}
