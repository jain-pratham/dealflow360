"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface UpsellRule {
  id: string;
  primaryProduct: string;
  suggestedProduct: string;
  coPurchaseScore: string;
}

export default function AdminUpsellRulesPage() {
  const rules: UpsellRule[] = [
    { id: "PAIR-01", primaryProduct: "Enterprise Server X1", suggestedProduct: "24/7 Premium Support Package", coPurchaseScore: "0.95" },
    { id: "PAIR-02", primaryProduct: "Enterprise Server X1", suggestedProduct: "Redundant Power Supply Unit", coPurchaseScore: "0.88" },
  ];

  const columns: Column<UpsellRule>[] = [
    { header: "Rule ID", accessorKey: "id" },
    { header: "Primary Item", accessorKey: "primaryProduct" },
    { header: "Suggested Upsell/Cross-sell", accessorKey: "suggestedProduct" },
    { header: "Recommendation Weight", accessorKey: "coPurchaseScore" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Product Intelligence"
        title="Upsell & Cross-Sell Recommendation Matrix"
        description="Configure pairings and recommendation weights that display inside the Sales Rep Quotation Builder panel."
      />
      <DataTable columns={columns} data={rules} />
    </AppLayout>
  );
}
