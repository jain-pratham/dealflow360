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
}

export default function ManagerDiscountRulesPage() {
  const rules: RuleRecord[] = [
    { id: "MR-1", tier: "GOLD", category: "Hardware", maxRepDiscount: "15%", managerThreshold: "Requires Manager Approval above 15%" },
    { id: "MR-2", tier: "SILVER", category: "Hardware", maxRepDiscount: "10%", managerThreshold: "Requires Manager Approval above 10%" },
  ];

  const columns: Column<RuleRecord>[] = [
    { header: "Customer Tier", accessorKey: "tier" },
    { header: "Product Category", accessorKey: "category" },
    { header: "Sales Rep Limit", accessorKey: "maxRepDiscount" },
    { header: "Manager Trigger Rule", accessorKey: "managerThreshold" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Discount Matrix"
        title="Manager Discount Tiers & Ceilings"
        description="View category discount limits and manager escalation triggers."
      />
      <DataTable columns={columns} data={rules} />
    </AppLayout>
  );
}
