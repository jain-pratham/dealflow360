"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface PriceListRecord {
  id: string;
  tier: string;
  category: string;
  discountCeiling: string;
  overridePrice: string;
}

export default function AdminPriceListsPage() {
  const priceLists: PriceListRecord[] = [
    { id: "PL-1", tier: "GOLD", category: "Hardware", discountCeiling: "25%", overridePrice: "Tier Standard" },
    { id: "PL-2", tier: "SILVER", category: "Hardware", discountCeiling: "15%", overridePrice: "Tier Standard" },
    { id: "PL-3", tier: "BRONZE", category: "Hardware", discountCeiling: "10%", overridePrice: "List Price" },
  ];

  const columns: Column<PriceListRecord>[] = [
    { header: "Customer Tier", accessorKey: "tier" },
    { header: "Category", accessorKey: "category" },
    { header: "Discount Ceiling", accessorKey: "discountCeiling" },
    { header: "Override Rule", accessorKey: "overridePrice" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Pricing Strategy"
        title="Price Lists & Tier Overrides"
        description="Set customer tier price rules, default discounts, and custom catalog price lists."
      />
      <DataTable columns={columns} data={priceLists} />
    </AppLayout>
  );
}
