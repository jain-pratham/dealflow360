"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface ApprovalTracker {
  id: string;
  quoteNumber: string;
  requiredRole: string;
  status: string;
  submittedAt: string;
}

export default function SalesApprovalsPage() {
  const approvals: ApprovalTracker[] = [
    { id: "APP-001", quoteNumber: "Q-2026-001", requiredRole: "SALES_MANAGER", status: "PENDING", submittedAt: "2026-09-04 14:00" },
    { id: "APP-002", quoteNumber: "Q-2026-002", requiredRole: "FINANCE", status: "APPROVED", submittedAt: "2026-09-02 11:30" },
  ];

  const columns: Column<ApprovalTracker>[] = [
    { header: "Approval ID", accessorKey: "id" },
    { header: "Quotation #", accessorKey: "quoteNumber" },
    { header: "Approver Role", accessorKey: "requiredRole" },
    {
      header: "Status",
      render: (row) => <StatusBadge type={row.status === "APPROVED" ? "success" : "warning"} label={row.status} />,
    },
    { header: "Submitted Date", accessorKey: "submittedAt" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Approval Status"
        title="Quotation Approval Tracker"
        description="Track manager and finance review decisions for quotes exceeding standard discount thresholds."
      />
      <DataTable columns={columns} data={approvals} />
    </AppLayout>
  );
}
