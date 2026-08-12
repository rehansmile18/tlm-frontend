"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentForm } from "@/components/assignments/assignment-form";
import { useTranslation } from "@/lib/i18n/i18n";

export default function NewAssignmentPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <>
      <Link
        href="/assignments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("assignments.backToAssignments")}
      </Link>

      <PageHeader title={t("assignments.newDialogTitle")} description={t("assignments.newDialogDescription")} />

      <Card>
        <CardContent className="pt-6">
          <AssignmentForm onDone={(saved) => router.push(`/assignments/${saved._id}`)} />
        </CardContent>
      </Card>
    </>
  );
}
