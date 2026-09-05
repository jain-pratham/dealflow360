"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface SubPlan {
  id: string;
  name: string;
  interval: string;
  prorationPolicy: string;
  refundPolicy: string;
}

export default function AdminSubscriptionPlansPage() {
  const plans: SubPlan[] = [
    { id: "PLAN-MON", name: "Monthly Enterprise Subscription", interval: "MONTHLY", prorationPolicy: "EXACT_DAY_PRO_RATA", refundPolicy: "PARTIAL_CREDIT_NOTE" },
    { id: "PLAN-ANN", name: "Annual Enterprise License", interval: "YEARLY", prorationPolicy: "MONTHLY_PRO_RATA", refundPolicy: "NON_REFUNDABLE" },
  ];

  const columns: Column<SubPlan>[] = [
    { header: "Plan ID", accessorKey: "id" },
    { header: "Plan Name", accessorKey: "name" },
    { header: "Billing Interval", accessorKey: "interval" },
    { header: "Proration Policy", accessorKey: "prorationPolicy" },
    { header: "Refund Policy", accessorKey: "refundPolicy" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Recurring Revenue"
        title="Subscription Plan Configuration"
        description="Set up recurring billing cycles, proration algorithms, and automated renewal terms."
      />
      <DataTable columns={columns} data={plans} />
    </AppLayout>
  );
}
