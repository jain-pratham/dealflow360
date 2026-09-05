"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface WarehouseRecord {
  id: string;
  name: string;
  location: string;
  shippingCostWeighting: string;
  status: string;
}

export default function AdminWarehousesPage() {
  const warehouses: WarehouseRecord[] = [
    { id: "WH-001", name: "Primary East Hub", location: "New Jersey, USA", shippingCostWeighting: "1.0x", status: "Active" },
    { id: "WH-002", name: "West Coast Fulfillment", location: "California, USA", shippingCostWeighting: "1.1x", status: "Active" },
  ];

  const columns: Column<WarehouseRecord>[] = [
    { header: "Hub ID", accessorKey: "id" },
    { header: "Warehouse Name", accessorKey: "name" },
    { header: "Location", accessorKey: "location" },
    { header: "Shipping Weighting", accessorKey: "shippingCostWeighting" },
    {
      header: "Status",
      render: (row) => <StatusBadge type="success" label={row.status} />,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Logistics Setup"
        title="Multi-Warehouse & Fulfillment Center Setup"
        description="Configure regional fulfillment hubs, location priority, and shipping cost weightings."
      />
      <DataTable columns={columns} data={warehouses} />
    </AppLayout>
  );
}
