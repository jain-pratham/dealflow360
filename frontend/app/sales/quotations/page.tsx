"use client";

import React from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { PlusCircle } from "lucide-react";

interface SalesQuote {
  id: string;
  client: string;
  dealValue: string;
  discount: string;
  status: "Draft" | "Pending Approval" | "Approved" | "Sent to Customer";
  createdDate: string;
}

export default function SalesQuotationsPage() {
  const quotes: SalesQuote[] = [
    { id: "Q-2026-001", client: "Acme Logistics Corp", dealValue: "$48,500.00", discount: "12%", status: "Pending Approval", createdDate: "2026-09-04" },
    { id: "Q-2026-002", client: "Global Tech Solutions", dealValue: "$120,000.00", discount: "8%", status: "Approved", createdDate: "2026-09-02" },
    { id: "Q-2026-003", client: "Apex Health Networks", dealValue: "$32,000.00", discount: "5%", status: "Sent to Customer", createdDate: "2026-09-01" },
  ];

  const columns: Column<SalesQuote>[] = [
    { header: "Quote #", accessorKey: "id" },
    { header: "Client Account", accessorKey: "client" },
    { header: "Total Value", accessorKey: "dealValue" },
    { header: "Discount Applied", accessorKey: "discount" },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={row.status === "Approved" ? "success" : row.status === "Pending Approval" ? "warning" : "info"}
          label={row.status}
        />
      ),
    },
    { header: "Created Date", accessorKey: "createdDate" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Sales Operations"
        title="Quotation Management"
        description="Build, manage, and track progress of customer proposals and deals."
        actions={
          <Link
            href="/sales/quotations/new"
            className="inline-flex items-center gap-2 bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-bold rounded-xl px-4 py-2 text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <PlusCircle size={16} /> New Quotation
          </Link>
        }
      />
      <DataTable columns={columns} data={quotes} />
    </AppLayout>
  );
}
