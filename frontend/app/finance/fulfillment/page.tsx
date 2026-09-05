"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface FulfillmentAllocation {
  id: string;
  quoteNumber: string;
  warehouse: string;
  allocatedQty: number;
  isBackorder: boolean;
  status: string;
}

export default function FinanceFulfillmentPage() {
  const allocations: FulfillmentAllocation[] = [
    { id: "ALLOC-01", quoteNumber: "Q-2026-002", warehouse: "Primary East Hub", allocatedQty: 2, isBackorder: false, status: "FULFILLED" },
    { id: "ALLOC-02", quoteNumber: "Q-2026-003", warehouse: "West Coast Hub", allocatedQty: 1, isBackorder: true, status: "BACKORDERED" },
  ];

  const columns: Column<FulfillmentAllocation>[] = [
    { header: "Allocation ID", accessorKey: "id" },
    { header: "Quotation #", accessorKey: "quoteNumber" },
    { header: "Fulfillment Hub", accessorKey: "warehouse" },
    { header: "Allocated Quantity", accessorKey: "allocatedQty" },
    {
      header: "Backorder Flag",
      render: (row) => (row.isBackorder ? <span className="text-xs font-bold text-amber-500">YES</span> : <span className="text-xs font-bold text-slate-400">NO</span>),
    },
    {
      header: "Status",
      render: (row) => <StatusBadge type={row.status === "FULFILLED" ? "success" : "warning"} label={row.status} />,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Fulfillment Governance"
        title="Warehouse Allocation & Inventory Fulfillment"
        description="Monitor multi-warehouse shipping allocations, fulfillment status, and inventory reservations."
      />
      <DataTable columns={columns} data={allocations} />
    </AppLayout>
  );
}
