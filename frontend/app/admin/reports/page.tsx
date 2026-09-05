"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";

export default function AdminReportsPage() {
  return (
    <AppLayout>
      <PageHeader
        badgeText="Analytics"
        title="Platform Analytics & Executive Reports"
        description="Comprehensive reporting on revenue pipeline, margin health, discount leakage, and fulfillment SLAs."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h4 className="font-bold text-slate-900 dark:text-white">Margin Analysis Report</h4>
          <p className="text-xs text-slate-500 mt-1">Tracks deal profitability across customer tiers and product categories.</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h4 className="font-bold text-slate-900 dark:text-white">Approval Velocity Report</h4>
          <p className="text-xs text-slate-500 mt-1">Measures turnaround times for Manager & Finance approval queues.</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h4 className="font-bold text-slate-900 dark:text-white">Discount Leakage Audit</h4>
          <p className="text-xs text-slate-500 mt-1">Identifies quotes with high discount percentages vs standard list prices.</p>
        </div>
      </div>
    </AppLayout>
  );
}
