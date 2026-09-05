"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface FulfillmentItem {
  id: string;
  quoteNumber: string;
  warehouse: string;
  allocatedQty: number;
  status: string;
}

export default function SalesFulfillmentPage() {
  const items: FulfillmentItem[] = [
    { id: "FUL-001", quoteNumber: "Q-2026-002", warehouse: "Primary East Hub", allocatedQty: 2, status: "FULFILLED" },
  ];

  const columns: Column<FulfillmentItem>[] = [
    { header: "Allocation ID", accessorKey: "id" },
    { header: "Quotation #", accessorKey: "quoteNumber" },
    { header: "Warehouse Hub", accessorKey: "warehouse" },
    { header: "Allocated Quantity", accessorKey: "allocatedQty" },
    {
      header: "Fulfillment Status",
      render: (row) => <StatusBadge type="success" label={row.status} />,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Fulfillment Status"
        title="Quotation Fulfillment Tracking"
        description="Monitor warehouse allocations, shipping progress, and backorder status for confirmed customer deals."
      />
      <DataTable columns={columns} data={items} />
    </AppLayout>
  );
}
