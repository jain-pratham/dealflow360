"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface SubSchedule {
  id: string;
  client: string;
  planName: string;
  cycle: string;
  nextBillingDate: string;
  status: string;
}

export default function FinanceSubscriptionsPage() {
  const subs: SubSchedule[] = [
    { id: "SUB-001", client: "Global Tech Solutions", planName: "Cloud Management Suite", cycle: "YEARLY", nextBillingDate: "2027-09-01", status: "ACTIVE" },
  ];

  const columns: Column<SubSchedule>[] = [
    { header: "Schedule ID", accessorKey: "id" },
    { header: "Customer Account", accessorKey: "client" },
    { header: "Subscription Plan", accessorKey: "planName" },
    { header: "Billing Cycle", accessorKey: "cycle" },
    { header: "Next Billing Date", accessorKey: "nextBillingDate" },
    {
      header: "Status",
      render: (row) => <StatusBadge type="success" label={row.status} />,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Recurring Revenue"
        title="Subscription Schedules & Proration Engine"
        description="Monitor automated recurring billing cycles, proration calculation, and active subscriber plans."
      />
      <DataTable columns={columns} data={subs} />
    </AppLayout>
  );
}
