"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon, ClockIcon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { humanizeError } from "@/components/data-state";
import { humanizePolicyType } from "@/lib/format";
import { assignmentsApi } from "@/lib/resources";
import type { Policy } from "@/lib/types";
import type { CoverageReport } from "@/lib/rule-coverage";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n/i18n";

/**
 * Whether this client's rules are actually usable, plus the two things that most often stand in
 * the way and are invisible everywhere else.
 *
 * The approvals queue exists because policies are maker-checker: TLM refuses to let the submitter
 * approve their own, so a client admin who has authored everything correctly can still be blocked
 * on a second person and have nothing on screen tell them so.
 *
 * The resolve check is the only honest way to answer "will this work". Coverage counts records;
 * resolve asks the Rule Repository the same question the pay engine asks, for a real date and
 * target, and reports what actually comes back.
 */
export function StepReview({
  clientId,
  coverage,
  pendingApprovals,
  assignmentCount,
  enabledStates,
}: {
  clientId: string;
  coverage: CoverageReport;
  pendingApprovals: Policy[];
  assignmentCount: number;
  enabledStates: string[];
}) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [employeeId, setEmployeeId] = useState("");
  const [state, setState] = useState(enabledStates[0] ?? "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const blockers: string[] = [];
  if (coverage.missingEssential.length > 0) {
    blockers.push(t("setup.review.blockerMissing", { types: coverage.missingEssential.map(humanizePolicyType).join(", ") }));
  }
  if (coverage.unusedEssential.length > 0) {
    blockers.push(t("setup.review.blockerUnused", { types: coverage.unusedEssential.map(humanizePolicyType).join(", ") }));
  }
  if (assignmentCount === 0) blockers.push(t("setup.review.blockerNoAssignment"));
  const ready = blockers.length === 0;

  const resolveCheck = useMutation({
    mutationFn: () =>
      assignmentsApi.resolve({
        clientId,
        employeeId: employeeId.trim(),
        date,
        state: state.trim() || undefined,
      }),
  });

  return (
    <div className="space-y-4">
      <div
        className={`flex items-start gap-3 rounded-lg border p-4 ${
          ready ? "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30" : "border-destructive/40 bg-destructive/5"
        }`}
      >
        {ready ? (
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <CircleAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
        )}
        <div className="min-w-0">
          <p className="font-semibold">{ready ? t("setup.review.readyTitle") : t("setup.review.notReadyTitle")}</p>
          {ready ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{t("setup.review.readyBody")}</p>
          ) : (
            <ul className="mt-1 list-disc space-y-0.5 ps-4 text-sm text-muted-foreground">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {coverage.recommendedForStates.length > 0 ? (
        <div className="rounded-lg border-l-2 border-l-amber-500 bg-muted/40 px-3 py-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />
            {t("setup.review.stateRecommendations")}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {coverage.recommendedForStates.map((r) => (
              <li key={`${r.state}-${r.policyType}`}>
                {t("setup.review.stateRecommendation", { state: r.state, type: humanizePolicyType(r.policyType) })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pendingApprovals.length > 0 ? (
        <div className="rounded-lg border p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ClockIcon className="size-4 text-amber-600 dark:text-amber-400" />
            {t("setup.review.awaitingApproval", { count: String(pendingApprovals.length) })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("setup.review.awaitingApprovalNote")}</p>
          <ul className="mt-2 space-y-1 text-xs">
            {pendingApprovals.map((p) => (
              <li key={`${p.policyId}-${p.version}`} className="flex items-center gap-2">
                <Link href={`/policies/${p.policyId}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
                <span className="font-mono text-[10px] uppercase text-muted-foreground">{p.policyType}</span>
                <span className="text-muted-foreground">
                  {p.status === "draft" ? t("setup.review.notSubmitted") : t("setup.review.submitted")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">{t("setup.review.checkTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("setup.review.checkBody")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="chk-emp">{t("setup.review.checkEmployee")}</Label>
            <Input id="chk-emp" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="emp-1001" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chk-state">{t("setup.review.checkState")}</Label>
            <Input id="chk-state" value={state} onChange={(e) => setState(e.target.value)} maxLength={3} placeholder="CA" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chk-date">{t("setup.review.checkDate")}</Label>
            <Input id="chk-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!employeeId.trim() || resolveCheck.isPending}
            onClick={() => resolveCheck.mutate()}
          >
            {resolveCheck.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {t("setup.review.runCheck")}
          </Button>
          <Link href="/resolve" className="text-xs text-muted-foreground hover:text-foreground">
            {t("setup.review.fullResolve")}
          </Link>
        </div>

        {resolveCheck.isError ? (
          // A 404 here is the most useful failure in the whole flow: it means nothing resolves for
          // that target, which is exactly what the pay engine would hit.
          <p className="rounded-md border-l-2 border-l-destructive bg-muted/50 px-2 py-1.5 text-xs">
            {humanizeError(resolveCheck.error)}
          </p>
        ) : null}
        {resolveCheck.data ? (
          <div className="rounded-md border-l-2 border-l-emerald-500 bg-muted/50 px-2 py-1.5 text-xs">
            <p className="font-medium">
              {t("setup.review.checkResolved", {
                group: resolveCheck.data.ruleGroup?.name ?? "—",
                count: String(resolveCheck.data.policies?.length ?? 0),
              })}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {(resolveCheck.data.policies ?? []).map((p) => humanizePolicyType(p.policyType)).join(" · ")}
            </p>
            {(resolveCheck.data.unresolvedRefs?.length ?? 0) > 0 ? (
              <p className="mt-1 text-destructive">
                {t("setup.review.checkUnresolved", { count: String(resolveCheck.data.unresolvedRefs.length) })}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {user?.role === "PLATFORM_ADMIN" ? null : (
        <p className="text-xs text-muted-foreground">{t("setup.review.scopeNote")}</p>
      )}
    </div>
  );
}
