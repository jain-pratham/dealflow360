"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { CheckCircle2, XCircle } from "lucide-react";

interface PendingApproval {
  id: string;
  quoteNumber: string;
  repName: string;
  discountRequested: string;
  margin: string;
  status: string;
}

export default function ManagerApprovalQueuePage() {
  const queue: PendingApproval[] = [
    { id: "APP-001", quoteNumber: "Q-2026-001", repName: "Sales Representative", discountRequested: "12%", margin: "24.5%", status: "Pending Manager Action" },
  ];

  const columns: Column<PendingApproval>[] = [
    { header: "Approval ID", accessorKey: "id" },
    { header: "Quotation #", accessorKey: "quoteNumber" },
    { header: "Sales Rep", accessorKey: "repName" },
    { header: "Requested Discount", accessorKey: "discountRequested" },
    { header: "Blended Margin", accessorKey: "margin" },
    {
      header: "Action Queue",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer transition-all">
            Approve
          </button>
          <button className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-500 hover:bg-rose-600 text-white cursor-pointer transition-all">
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Approval Workflows"
        title="Manager Approval Queue"
        description="Review proposals that exceed standard discount ceilings and require commercial approval."
      />
      <DataTable columns={columns} data={queue} />
    </AppLayout>
  );
}
