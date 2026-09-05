"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface CreditNoteItem {
  id: string;
  cnNumber: string;
  client: string;
  amount: string;
  reason: string;
  issuedDate: string;
}

export default function FinanceCreditNotesPage() {
  const creditNotes: CreditNoteItem[] = [
    { id: "CN-001", cnNumber: "CN-2026-001", client: "Acme Logistics Corp", amount: "$1,200.00", reason: "Mid-cycle subscription tier adjustment", issuedDate: "2026-09-03" },
  ];

  const columns: Column<CreditNoteItem>[] = [
    { header: "ID", accessorKey: "id" },
    { header: "Credit Note #", accessorKey: "cnNumber" },
    { header: "Customer Account", accessorKey: "client" },
    { header: "Credit Amount", accessorKey: "amount" },
    { header: "Adjustment Reason", accessorKey: "reason" },
    { header: "Issued Date", accessorKey: "issuedDate" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Financial Adjustments"
        title="Credit Notes & Refund Management"
        description="Issue credit notes for proration adjustments, returned orders, and invoice corrections."
      />
      <DataTable columns={columns} data={creditNotes} />
    </AppLayout>
  );
}
