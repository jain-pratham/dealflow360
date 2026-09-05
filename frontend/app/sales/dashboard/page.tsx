"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";

export default function SalesDashboardPage() {
  return (
    <AppLayout>
      <PageHeader
        badgeText="Sales Operations"
        title="Sales Dashboard"
        description="Quotations and pipeline dashboard."
      />
      <div className="min-h-[400px] flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Sales Dashboard</p>
      </div>
    </AppLayout>
  );
}
