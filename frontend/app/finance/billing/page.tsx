"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  client: string;
  amount: string;
  status: string;
  dueDate: string;
}

export default function FinanceBillingPage() {
  const invoices: InvoiceItem[] = [
    { id: "INV-101", invoiceNumber: "INV-2026-101", client: "Global Tech Solutions", amount: "$120,000.00", status: "PAID", dueDate: "2026-09-30" },
    { id: "INV-102", invoiceNumber: "INV-2026-102", client: "Acme Logistics Corp", amount: "$48,500.00", status: "UNPAID", dueDate: "2026-10-15" },
  ];

  const columns: Column<InvoiceItem>[] = [
    { header: "ID", accessorKey: "id" },
    { header: "Invoice Number", accessorKey: "invoiceNumber" },
    { header: "Customer Account", accessorKey: "client" },
    { header: "Invoice Amount", accessorKey: "amount" },
    {
      header: "Status",
      render: (row) => <StatusBadge type={row.status === "PAID" ? "success" : "warning"} label={row.status} />,
    },
    { header: "Due Date", accessorKey: "dueDate" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Accounts Receivable"
        title="Commercial Billing & Invoicing Operations"
        description="Manage customer invoice issuance, payment collections, and overdue accounts."
      />
      <DataTable columns={columns} data={invoices} />
    </AppLayout>
  );
}
