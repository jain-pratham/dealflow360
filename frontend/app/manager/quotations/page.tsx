"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface ManagerQuote {
  id: string;
  repName: string;
  client: string;
  dealValue: string;
  discount: string;
  status: string;
}

export default function ManagerQuotationsPage() {
  const quotes: ManagerQuote[] = [
    { id: "Q-2026-001", repName: "Sales Representative", client: "Acme Logistics Corp", dealValue: "$48,500.00", discount: "12%", status: "Pending Manager Review" },
    { id: "Q-2026-002", repName: "Sales Representative", client: "Global Tech Solutions", dealValue: "$120,000.00", discount: "8%", status: "Approved" },
  ];

  const columns: Column<ManagerQuote>[] = [
    { header: "Quote #", accessorKey: "id" },
    { header: "Sales Rep", accessorKey: "repName" },
    { header: "Client", accessorKey: "client" },
    { header: "Deal Value", accessorKey: "dealValue" },
    { header: "Discount", accessorKey: "discount" },
    {
      header: "Status",
      render: (row) => <StatusBadge type={row.status === "Approved" ? "success" : "warning"} label={row.status} />,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Team Supervision"
        title="Team Quotations & Commercial Review"
        description="Review all team deal submissions, discount exceptions, and commercial margins."
      />
      <DataTable columns={columns} data={quotes} />
    </AppLayout>
  );
}
