"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface BackorderItem {
  id: string;
  quoteNumber: string;
  productName: string;
  quantityPending: number;
  status: string;
}

export default function FinanceBackordersPage() {
  const backorders: BackorderItem[] = [
    { id: "BO-001", quoteNumber: "Q-2026-003", productName: "Enterprise Server X1", quantityPending: 1, status: "WAITING_FOR_STOCK" },
  ];

  const columns: Column<BackorderItem>[] = [
    { header: "Backorder ID", accessorKey: "id" },
    { header: "Quotation #", accessorKey: "quoteNumber" },
    { header: "Product Item", accessorKey: "productName" },
    { header: "Pending Stock Qty", accessorKey: "quantityPending" },
    {
      header: "Status",
      render: (row) => <StatusBadge type="warning" label={row.status} />,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Backorder Operations"
        title="Backorders & Consolidation Queue"
        description="Track out-of-stock items, purchase order arrivals, and partial shipment consolidations."
      />
      <DataTable columns={columns} data={backorders} />
    </AppLayout>
  );
}
