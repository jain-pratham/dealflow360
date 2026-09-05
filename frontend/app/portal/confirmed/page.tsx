"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface ConfirmedQuote {
  id: string;
  quoteNumber: string;
  totalAmount: string;
  confirmedDate: string;
  status: string;
}

export default function CustomerConfirmedPage() {
  const confirmed: ConfirmedQuote[] = [
    { id: "Q-2026-002", quoteNumber: "Q-2026-002", totalAmount: "$120,000.00", confirmedDate: "2026-09-02", status: "Confirmed & Invoiced" },
  ];

  const columns: Column<ConfirmedQuote>[] = [
    { header: "Quotation #", accessorKey: "quoteNumber" },
    { header: "Final Value", accessorKey: "totalAmount" },
    { header: "Confirmation Date", accessorKey: "confirmedDate" },
    {
      header: "Status",
      render: (row) => <StatusBadge type="success" label={row.status} />,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Confirmed Agreements"
        title="Confirmed Orders & Agreements"
        description="View finalized quotations, accepted terms, and fulfillment progress."
      />
      <DataTable columns={columns} data={confirmed} />
    </AppLayout>
  );
}
