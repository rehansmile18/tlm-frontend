"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PolicyForm } from "@/components/policies/policy-form";
import { usePolicyTypes } from "@/lib/hooks";
import { useTranslation } from "@/lib/i18n/i18n";

export default function NewPolicyPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const policyTypes = usePolicyTypes();

  return (
    <>
      <Link href="/policies" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("policies.backToPolicies")}
      </Link>

      <PageHeader title={t("policies.newPolicyTitle")} description={t("policies.newDescription")} />

      <Card>
        <CardContent className="pt-6">
          <PolicyForm
            policyTypes={policyTypes.data?.policyTypes ?? []}
            onDone={(saved) => router.push(`/policies/${saved.policyId}`)}
          />
        </CardContent>
      </Card>
    </>
  );
}
