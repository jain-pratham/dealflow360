"use client";

import React from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { ChevronRight } from "lucide-react";

interface NegotiationQuote {
  id: string;
  quoteNumber: string;
  totalAmount: string;
  counterDiscount: string;
  status: string;
}

export default function CustomerNegotiationPage() {
  const items: NegotiationQuote[] = [
    { id: "Q-2026-003", quoteNumber: "Q-2026-003", totalAmount: "$32,000.00", counterDiscount: "Requested 8% Counter", status: "Under Negotiation" },
  ];

  const columns: Column<NegotiationQuote>[] = [
    { header: "Quotation #", accessorKey: "quoteNumber" },
    { header: "Proposal Total", accessorKey: "totalAmount" },
    { header: "Counter Proposal", accessorKey: "counterDiscount" },
    {
      header: "Status",
      render: (row) => <StatusBadge type="warning" label={row.status} />,
    },
    {
      header: "Action",
      render: (row) => (
        <Link
          href={`/portal/quotations/${row.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0D69B2] hover:underline"
        >
          Manage Negotiation <ChevronRight size={14} />
        </Link>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Active Negotiation"
        title="Proposals Under Active Negotiation"
        description="Track active discount counters and line-level comments submitted to sales."
      />
      <DataTable columns={columns} data={items} />
    </AppLayout>
  );
}
