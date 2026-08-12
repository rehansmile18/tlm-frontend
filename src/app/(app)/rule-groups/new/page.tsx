"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RuleGroupForm } from "@/components/rule-groups/rule-group-form";
import { useTranslation } from "@/lib/i18n/i18n";

export default function NewRuleGroupPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <>
      <Link
        href="/rule-groups"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("ruleGroups.backToRuleGroups")}
      </Link>

      <PageHeader title={t("ruleGroups.newDialogTitle")} description={t("ruleGroups.dialogDescription")} />

      <Card>
        <CardContent className="pt-6">
          <RuleGroupForm onDone={(saved) => router.push(`/rule-groups/${saved.ruleGroupId}`)} />
        </CardContent>
      </Card>
    </>
  );
}
