"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  basePrice: string;
  costPrice: string;
  type: string;
}

export default function AdminProductsPage() {
  const products: ProductItem[] = [
    { id: "PROD-1", sku: "SKU-HW-001", name: "Enterprise Server X1", category: "Hardware", basePrice: "$12,500.00", costPrice: "$8,200.00", type: "HARDWARE" },
    { id: "PROD-2", sku: "SKU-SW-002", name: "Cloud Management Suite", category: "Software", basePrice: "$4,500.00/yr", costPrice: "$1,100.00", type: "SUBSCRIPTION" },
    { id: "PROD-3", sku: "SKU-SV-003", name: "Implementation & Setup Service", category: "Services", basePrice: "$3,200.00", costPrice: "$1,800.00", type: "SERVICE" },
  ];

  const columns: Column<ProductItem>[] = [
    { header: "SKU", accessorKey: "sku" },
    { header: "Product Name", accessorKey: "name" },
    { header: "Category", accessorKey: "category" },
    { header: "Base Price", accessorKey: "basePrice" },
    { header: "Cost Price", accessorKey: "costPrice" },
    { header: "Type", accessorKey: "type" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Product Catalog"
        title="Product & Service Catalog Management"
        description="Configure hardware SKUs, software subscriptions, cost prices, and base price levels."
      />
      <DataTable columns={columns} data={products} />
    </AppLayout>
  );
}
