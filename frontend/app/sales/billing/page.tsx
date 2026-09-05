"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  client: string;
  amount: string;
  status: string;
  dueDate: string;
}

export default function SalesBillingPage() {
  const invoices: InvoiceRecord[] = [
    { id: "INV-001", invoiceNumber: "INV-2026-101", client: "Global Tech Solutions", amount: "$120,000.00", status: "PAID", dueDate: "2026-09-30" },
  ];

  const columns: Column<InvoiceRecord>[] = [
    { header: "ID", accessorKey: "id" },
    { header: "Invoice Number", accessorKey: "invoiceNumber" },
    { header: "Client Account", accessorKey: "client" },
    { header: "Amount", accessorKey: "amount" },
    {
      header: "Payment Status",
      render: (row) => <StatusBadge type="success" label={row.status} />,
    },
    { header: "Due Date", accessorKey: "dueDate" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Commercial Invoicing"
        title="Quotation Billing & Payment Tracking"
        description="Track customer invoice generation, payment milestones, and recurring billing cycles."
      />
      <DataTable columns={columns} data={invoices} />
    </AppLayout>
  );
}
