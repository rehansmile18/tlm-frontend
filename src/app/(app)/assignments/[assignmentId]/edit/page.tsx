"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/data-state";
import { AssignmentEditForm } from "@/components/assignments/assignment-edit-form";
import { assignmentsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useTranslation } from "@/lib/i18n/i18n";

export default function EditAssignmentPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const query = useQuery({ queryKey: queryKeys.assignment(assignmentId), queryFn: () => assignmentsApi.get(assignmentId) });

  return (
    <>
      <Link
        href={`/assignments/${assignmentId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("common.back")}
      </Link>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading || !query.data ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <PageHeader title={t("assignments.editDialogTitle")} description={t("assignments.editDialogDescription")} />

          <Card>
            <CardContent className="pt-6">
              <AssignmentEditForm
                assignment={query.data}
                onDone={(saved) => router.push(`/assignments/${saved._id}`)}
              />
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
