"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { ErrorState } from "@/components/data-state";
import { StatusBadge } from "@/components/status-badge";
import { SetupStepCard, type StepState } from "@/components/setup/setup-step-card";
import { StepPolicies } from "@/components/setup/step-policies";
import { StepRuleGroup } from "@/components/setup/step-rule-group";
import { StepAssignments } from "@/components/setup/step-assignments";
import { StepReview } from "@/components/setup/step-review";
import { buildCoverage } from "@/lib/rule-coverage";
import { assignmentsApi, clientsApi, policiesApi, ruleGroupsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useRole } from "@/lib/auth";
import { useClients } from "@/lib/hooks";
import { useTranslation } from "@/lib/i18n/i18n";

const COUNTED_STEPS = 3;

/**
 * Guided rule setup for one client.
 *
 * A CLIENT_ADMIN gets their own client with no choice to make. A PLATFORM_ADMIN has no single "my
 * client", so they pick one — the same answer the operations app's setup already gave, and the
 * reason this originally turned them away was a worse one: onboarding and support are exactly
 * when someone spanning every client needs this page, and hiding it from them meant the whole
 * feature was invisible to the account most likely to be driving a new client's setup.
 */
export default function RulesSetupPage() {
  const { t } = useTranslation();
  const { isPlatformAdmin, clientId: ownClientId } = useRole();

  // Own client for a client admin; a chosen one for a platform admin.
  const clientQuery = useQuery({
    queryKey: queryKeys.myClient,
    queryFn: () => clientsApi.getMine(),
    enabled: !isPlatformAdmin,
  });
  const clientsQuery = useClients();
  const [pickedClientId, setPickedClientId] = useState("");

  const client = isPlatformAdmin
    ? (clientsQuery.data?.items ?? []).find((c) => c._id === pickedClientId) ?? null
    : clientQuery.data?.client ?? null;
  const clientId = client?._id ?? (isPlatformAdmin ? pickedClientId : ownClientId ?? "");

  // Scoped to the caller's own client server-side; global templates come back alongside their own
  // policies, which is what makes a client admin able to assemble a rule set at all.
  const policiesQuery = useQuery({
    queryKey: queryKeys.policies({ pageSize: 200 }),
    queryFn: () => policiesApi.list({ pageSize: 200 }),
  });
  const ruleGroupsQuery = useQuery({
    queryKey: queryKeys.ruleGroups({ clientId }),
    queryFn: () => ruleGroupsApi.list({ clientId, pageSize: 100 }),
    enabled: Boolean(clientId),
  });
  const assignmentsQuery = useQuery({
    queryKey: queryKeys.assignments({ clientId }),
    queryFn: () => assignmentsApi.list({ clientId, pageSize: 100 }),
    enabled: Boolean(clientId),
  });

  const policies = policiesQuery.data?.items ?? [];
  const ruleGroups = ruleGroupsQuery.data?.items ?? [];
  const assignments = assignmentsQuery.data?.items ?? [];
  const enabledStates = client?.enabledStates ?? [];

  const coverage = useMemo(() => buildCoverage(policies, ruleGroups, enabledStates), [policies, ruleGroups, enabledStates]);

  // Only this client's own drafts/submissions — a global template awaiting approval is the
  // platform team's problem, not something this client can act on.
  const pendingApprovals = policies.filter(
    (p) => p.scope === "client" && (p.status === "draft" || p.status === "pending_approval")
  );

  const policiesState: StepState = coverage.missingEssential.length > 0 ? "blocked" : "done";
  const ruleGroupState: StepState =
    ruleGroups.some((g) => g.status === "active")
      ? coverage.unusedEssential.length > 0
        ? "attention"
        : "done"
      : "blocked";
  const assignmentState: StepState = assignments.length > 0 ? "done" : "blocked";
  const readyCount = [policiesState, ruleGroupState, assignmentState].filter((s) => s !== "blocked").length;

  const loading = (isPlatformAdmin ? clientsQuery.isLoading : clientQuery.isLoading) || policiesQuery.isLoading;

  return (
    <>
      <PageHeader title={t("setup.title")} description={t("setup.description")} />

      {isPlatformAdmin ? (
        <Card>
          <CardContent className="space-y-1.5 pt-6">
            <Label htmlFor="setup-client">{t("setup.chooseClient")}</Label>
            <Combobox
              id="setup-client"
              value={pickedClientId}
              onValueChange={setPickedClientId}
              placeholder={t("setup.chooseClientPlaceholder")}
            >
              {(clientsQuery.data?.items ?? []).map((c) => (
                <ComboboxItem key={c._id} value={c._id}>
                  {c.name}
                </ComboboxItem>
              ))}
            </Combobox>
          </CardContent>
        </Card>
      ) : null}

      {clientQuery.isError ? (
        <ErrorState error={clientQuery.error} onRetry={() => clientQuery.refetch()} />
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !client ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {isPlatformAdmin ? t("setup.chooseClientFirst") : t("setup.noClient")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("setup.progress")}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {readyCount}
                  <span className="text-base font-normal text-muted-foreground"> / {COUNTED_STEPS}</span>
                </p>
              </div>
              <div className="h-1.5 min-w-40 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${(readyCount / COUNTED_STEPS) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">{client.name}</span>
                {enabledStates.length > 0 ? (
                  enabledStates.map((s) => (
                    <StatusBadge key={s} tone="info">
                      {s}
                    </StatusBadge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">{t("setup.noStates")}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <SetupStepCard
            index={1}
            title={t("setup.policies.title")}
            description={t("setup.policies.description")}
            state={policiesState}
            defaultOpen={policiesState === "blocked"}
            summary={t("setup.policies.summary", {
              available: String(coverage.types.filter((c) => c.available.length > 0).length),
              total: String(coverage.types.length),
            })}
          >
            <StepPolicies coverage={coverage} />
          </SetupStepCard>

          <SetupStepCard
            index={2}
            title={t("setup.ruleGroup.title")}
            description={t("setup.ruleGroup.description")}
            state={ruleGroupState}
            defaultOpen={ruleGroupState === "blocked"}
            summary={t("setup.ruleGroup.summary", {
              count: String(ruleGroups.filter((g) => g.status === "active").length),
            })}
          >
            <StepRuleGroup clientId={clientId} coverage={coverage} ruleGroups={ruleGroups} />
          </SetupStepCard>

          <SetupStepCard
            index={3}
            title={t("setup.assignments.title")}
            description={t("setup.assignments.description")}
            state={assignmentState}
            defaultOpen={assignmentState === "blocked"}
            summary={t("setup.assignments.summary", { count: String(assignments.length) })}
          >
            <StepAssignments
              clientId={clientId}
              ruleGroups={ruleGroups}
              assignments={assignments}
              enabledStates={enabledStates}
            />
          </SetupStepCard>

          <SetupStepCard
            index={4}
            title={t("setup.review.title")}
            description={t("setup.review.description")}
            state={readyCount === COUNTED_STEPS ? "done" : "blocked"}
            defaultOpen
          >
            <StepReview
              clientId={clientId}
              coverage={coverage}
              pendingApprovals={pendingApprovals}
              assignmentCount={assignments.length}
              enabledStates={enabledStates}
            />
          </SetupStepCard>
        </div>
      )}
    </>
  );
}
