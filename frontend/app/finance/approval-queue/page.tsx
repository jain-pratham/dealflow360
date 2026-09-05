"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface FinanceApproval {
  id: string;
  quoteNumber: string;
  client: string;
  dealValue: string;
  discountRequested: string;
  blendedMargin: string;
}

export default function FinanceApprovalQueuePage() {
  const items: FinanceApproval[] = [
    { id: "APP-FIN-01", quoteNumber: "Q-2026-002", client: "Global Tech Solutions", dealValue: "$120,000.00", discountRequested: "22%", blendedMargin: "14.2%" },
  ];

  const columns: Column<FinanceApproval>[] = [
    { header: "ID", accessorKey: "id" },
    { header: "Quotation #", accessorKey: "quoteNumber" },
    { header: "Client Account", accessorKey: "client" },
    { header: "Deal Value", accessorKey: "dealValue" },
    { header: "Requested Discount", accessorKey: "discountRequested" },
    { header: "Blended Margin", accessorKey: "blendedMargin" },
    {
      header: "Finance Gatekeeper",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer transition-all">
            Authorize
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
        badgeText="Second-Level Approvals"
        title="Finance Approval Queue & Risk Gatekeeping"
        description="Review high-risk proposals, extreme discount exceptions, and sub-margin deal approvals."
      />
      <DataTable columns={columns} data={items} />
    </AppLayout>
  );
}
