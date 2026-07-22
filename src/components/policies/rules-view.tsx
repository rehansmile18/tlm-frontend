import { humanizeKey } from "./rules-fields";

function RenderValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  if (typeof value === "number" || typeof value === "string") return <>{String(value)}</>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">None</span>;
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
  const entries = Object.entries(value ?? {});
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No rule fields.</p>;
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {entries.map(([key, val]) => {
        const nested = val !== null && typeof val === "object";
        return (
          <div key={key} className={nested ? "space-y-1 sm:col-span-2" : "space-y-0.5"}>
            <dt className="text-xs text-muted-foreground">{humanizeKey(key)}</dt>
            <dd className="text-sm">
              <RenderValue value={val} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
