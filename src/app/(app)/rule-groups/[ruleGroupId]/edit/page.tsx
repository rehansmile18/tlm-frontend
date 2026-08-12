"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/data-state";
import { RuleGroupForm } from "@/components/rule-groups/rule-group-form";
import { ruleGroupsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useTranslation } from "@/lib/i18n/i18n";

export default function EditRuleGroupPage() {
  const { ruleGroupId } = useParams<{ ruleGroupId: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const rgQuery = useQuery({ queryKey: queryKeys.ruleGroup(ruleGroupId), queryFn: () => ruleGroupsApi.get(ruleGroupId) });

  return (
    <>
      <Link
        href={`/rule-groups/${ruleGroupId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("common.back")}
      </Link>

      {rgQuery.isError ? (
        <ErrorState error={rgQuery.error} onRetry={() => rgQuery.refetch()} />
      ) : rgQuery.isLoading || !rgQuery.data ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <PageHeader title={t("ruleGroups.editDialogTitle")} description={t("ruleGroups.dialogDescription")} />

          <Card>
            <CardContent className="pt-6">
              <RuleGroupForm
                ruleGroup={rgQuery.data}
                onDone={(saved) => router.push(`/rule-groups/${saved.ruleGroupId}`)}
              />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
