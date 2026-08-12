"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { UserForm } from "@/components/users/user-form";
import { useTranslation } from "@/lib/i18n/i18n";

export default function NewUserPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <>
      <Link href="/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("common.back")}
      </Link>

      <PageHeader title={t("users.newDialogTitle")} description={t("users.newDialogDescription")} />

      <Card>
        <CardContent className="pt-6">
          <UserForm onDone={() => router.push("/users")} />
        </CardContent>
      </Card>
    </>
  );
}
