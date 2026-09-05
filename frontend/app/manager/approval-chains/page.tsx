"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";

export default function ManagerApprovalChainsPage() {
  return (
    <AppLayout>
      <PageHeader
        badgeText="Approval Matrix"
        title="Manager Approval Chains"
        description="View sequential approval levels configured for commercial proposals."
      />
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Manager Escalation Hierarchy</h3>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
          Level 1: Sales Manager Review &rarr; Level 2: Finance Review (for discounts &gt; 25%)
        </div>
      </div>
    </AppLayout>
  );
}
