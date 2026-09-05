"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface RuleRecord {
  id: string;
  tier: string;
  category: string;
  maxRepDiscount: string;
  managerThreshold: string;
  financeThreshold: string;
}

export default function DiscountRulesPage() {
  const rules: RuleRecord[] = [
    { id: "R-1", tier: "GOLD", category: "Hardware", maxRepDiscount: "15%", managerThreshold: "> 15%", financeThreshold: "> 25%" },
    { id: "R-2", tier: "SILVER", category: "Hardware", maxRepDiscount: "10%", managerThreshold: "> 10%", financeThreshold: "> 20%" },
    { id: "R-3", tier: "BRONZE", category: "Hardware", maxRepDiscount: "5%", managerThreshold: "> 5%", financeThreshold: "> 15%" },
  ];

  const columns: Column<RuleRecord>[] = [
    { header: "Tier", accessorKey: "tier" },
    { header: "Category", accessorKey: "category" },
    { header: "Max Rep Discount", accessorKey: "maxRepDiscount" },
    { header: "Manager Approval", accessorKey: "managerThreshold" },
    { header: "Finance Approval", accessorKey: "financeThreshold" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Discount Governance"
        title="Discount Matrix & Approval Thresholds"
        description="Configure automated discount ceilings and multi-level approval triggers."
      />
      <DataTable columns={columns} data={rules} />
    </AppLayout>
  );
}
