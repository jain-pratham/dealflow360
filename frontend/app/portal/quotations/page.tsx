"use client";

import React from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { ChevronRight } from "lucide-react";

interface CustomerProposal {
  id: string;
  quoteNumber: string;
  totalAmount: string;
  status: "Sent to Customer" | "Under Negotiation" | "Confirmed";
  updatedDate: string;
}

export default function CustomerQuotationsPage() {
  const quotes: CustomerProposal[] = [
    { id: "Q-2026-003", quoteNumber: "Q-2026-003", totalAmount: "$32,000.00", status: "Under Negotiation", updatedDate: "2026-09-04" },
    { id: "Q-2026-002", quoteNumber: "Q-2026-002", totalAmount: "$120,000.00", status: "Confirmed", updatedDate: "2026-09-02" },
  ];

  const columns: Column<CustomerProposal>[] = [
    { header: "Quotation #", accessorKey: "quoteNumber" },
    { header: "Proposal Total", accessorKey: "totalAmount" },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={row.status === "Confirmed" ? "success" : row.status === "Under Negotiation" ? "warning" : "info"}
          label={row.status}
        />
      ),
    },
    { header: "Last Activity", accessorKey: "updatedDate" },
    {
      header: "Action",
      render: (row) => (
        <Link
          href={`/portal/quotations/${row.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0D69B2] hover:underline"
        >
          View Proposal <ChevronRight size={14} />
        </Link>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Customer Portal"
        title="My Commercial Proposals"
        description="Review proposals received from sales, request term changes, submit counter offers, or confirm orders."
      />
      <DataTable columns={columns} data={quotes} />
    </AppLayout>
  );
}
