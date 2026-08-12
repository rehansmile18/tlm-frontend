"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/data-state";
import { PolicyForm } from "@/components/policies/policy-form";
import { policiesApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { usePolicyTypes } from "@/lib/hooks";
import { useTranslation } from "@/lib/i18n/i18n";

export default function EditPolicyPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const policyTypes = usePolicyTypes();

  const policyQuery = useQuery({ queryKey: queryKeys.policy(policyId), queryFn: () => policiesApi.get(policyId) });

  return (
    <>
      <Link
        href={`/policies/${policyId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("common.back")}
      </Link>

      {policyQuery.isError ? (
        <ErrorState error={policyQuery.error} onRetry={() => policyQuery.refetch()} />
      ) : policyQuery.isLoading || !policyQuery.data ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <PageHeader title={t("policies.editPolicyTitle")} description={t("policies.editDescription")} />

          <Card>
            <CardContent className="pt-6">
              <PolicyForm
                policy={policyQuery.data}
                policyTypes={policyTypes.data?.policyTypes ?? []}
                onDone={(saved) => router.push(`/policies/${saved.policyId}`)}
              />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
