"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";

export default function FinanceReportsPage() {
  return (
    <AppLayout>
      <PageHeader
        badgeText="Financial Reporting"
        title="Finance Revenue & Margin Analytics"
        description="Comprehensive reports on recognized revenue, outstanding collections, and credit note liabilities."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Monthly ARR & Recurring Revenue</h4>
          <p className="text-xs text-slate-500 mt-1">Breakdown of subscription ARR vs one-time hardware revenue.</p>
        </div>
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Accounts Receivable Aging</h4>
          <p className="text-xs text-slate-500 mt-1">Aging analysis for 30, 60, and 90+ days overdue commercial invoices.</p>
        </div>
      </div>
    </AppLayout>
  );
}
