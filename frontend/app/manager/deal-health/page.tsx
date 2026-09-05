"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";

export default function ManagerDealHealthPage() {
  return (
    <AppLayout>
      <PageHeader
        badgeText="Risk Oversight"
        title="Manager Deal Health & Risk Radar"
        description="Identify stalled sales pipeline opportunities, high discount anomalies, and low margin proposals."
      />
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Risk Alerts (1)</h3>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-semibold">
          Quotation Q-2026-001 (Acme Logistics) has been pending in drafting stage for 4 days without customer response.
        </div>
      </div>
    </AppLayout>
  );
}
