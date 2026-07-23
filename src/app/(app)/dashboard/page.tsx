"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, Building2Icon, FileTextIcon, Layers3Icon, ShieldCheckIcon, TargetIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { assignmentsApi, clientsApi, policiesApi, ruleGroupsApi } from "@/lib/resources";
import { queryKeys } from "@/lib/query-keys";
import { useAuth, useRole } from "@/lib/auth";
import { humanizeRole } from "@/lib/format";

function StatCard({
  label,
  value,
  loading,
  icon,
  href,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-primary/40">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardDescription>{label}</CardDescription>
          <span className="text-muted-foreground">{icon}</span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <span className="text-3xl font-semibold tabular-nums">{value ?? "—"}</span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { isPlatformAdmin } = useRole();

  const policies = useQuery({ queryKey: queryKeys.policies({ pageSize: 1 }), queryFn: () => policiesApi.list({ pageSize: 1 }) });
  const ruleGroups = useQuery({ queryKey: queryKeys.ruleGroups({ pageSize: 1 }), queryFn: () => ruleGroupsApi.list({ pageSize: 1 }) });
  const assignments = useQuery({ queryKey: queryKeys.assignments({ pageSize: 1 }), queryFn: () => assignmentsApi.list({ pageSize: 1 }) });
  const clients = useQuery({ queryKey: queryKeys.clients, queryFn: () => clientsApi.list(), enabled: isPlatformAdmin });

  return (
    <>
      <PageHeader
        title={`Welcome back${user ? `, ${user.email.split("@")[0]}` : ""}`}
        description={user ? `Signed in as ${humanizeRole(user.role)}${user.clientId ? "" : " · all clients"}` : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Policies" href="/policies" loading={policies.isLoading} value={policies.data?.total} icon={<FileTextIcon className="size-4" />} />
        <StatCard label="Rule Groups" href="/rule-groups" loading={ruleGroups.isLoading} value={ruleGroups.data?.total} icon={<Layers3Icon className="size-4" />} />
        <StatCard label="Assignments" href="/assignments" loading={assignments.isLoading} value={assignments.data?.total} icon={<TargetIcon className="size-4" />} />
        {isPlatformAdmin ? (
          <StatCard label="Clients" href="/clients" loading={clients.isLoading} value={clients.data?.items.length} icon={<Building2Icon className="size-4" />} />
        ) : (
          <StatCard label="Rule sets" href="/rule-groups" loading={ruleGroups.isLoading} value={ruleGroups.data?.total} icon={<Layers3Icon className="size-4" />} />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4 text-primary" />
              Resolve rules for a worker
            </CardTitle>
            <CardDescription>
              The payoff query: pick an employee, date, and location, and see the exact rule group and expanded
              policies that applied.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/resolve" />}>
              Open resolver
              <ArrowRightIcon className="size-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileTextIcon className="size-4 text-primary" />
              Author a policy
            </CardTitle>
            <CardDescription>
              Create global (statutory) or client-specific policies with effective-dated versioning and a
              maker-checker approval trail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" nativeButton={false} render={<Link href="/policies" />}>
              Go to policies
              <ArrowRightIcon className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
