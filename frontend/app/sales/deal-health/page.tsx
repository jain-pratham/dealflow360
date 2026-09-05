"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { HeartPulse, AlertTriangle } from "lucide-react";

export default function SalesDealHealthPage() {
  return (
    <AppLayout>
      <PageHeader
        badgeText="Deal Governance"
        title="Deal Health & Anomaly Insights"
        description="Monitor stalled proposals, discount anomalies, margin risks, and fulfillment delays."
      />
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-amber-700 dark:text-amber-400">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} />
            <div>
              <div className="font-bold text-sm">Discount Anomaly Detected</div>
              <div className="text-xs">Quotation Q-2026-001 discount of 12% is higher than 10% average for Silver tier clients.</div>
            </div>
          </div>
          <span className="text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20">MEDIUM</span>
        </div>
      </div>
    </AppLayout>
  );
}
