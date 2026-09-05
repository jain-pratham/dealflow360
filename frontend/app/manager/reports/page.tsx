"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";

export default function ManagerReportsPage() {
  return (
    <AppLayout>
      <PageHeader
        badgeText="Sales Analytics"
        title="Manager Performance & Pipeline Reports"
        description="Analyze team deal throughput, discount averages, and quote approval conversion rates."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Team Discount Variance Report</h4>
          <p className="text-xs text-slate-500 mt-1">Average rep discount breakdown vs quarterly deal targets.</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Manager Approval Velocity</h4>
          <p className="text-xs text-slate-500 mt-1">Average time spent in manager approval queue before customer dispatch.</p>
        </div>
      </div>
    </AppLayout>
  );
}
