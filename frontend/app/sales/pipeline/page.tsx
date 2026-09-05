"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";

export default function SalesPipelinePage() {
  return (
    <AppLayout>
      <PageHeader
        badgeText="Pipeline Management"
        title="Sales Deal Pipeline"
        description="Track active opportunity stages, customer proposals, and negotiation status."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Drafting (1)</h4>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium text-xs">Acme Logistics — $48,500</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500 mb-3">Pending Review (1)</h4>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium text-xs">Global Tech — $120,000</div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-500 mb-3">Confirmed / Won (1)</h4>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-medium text-xs">Apex Health — $32,000</div>
        </div>
      </div>
    </AppLayout>
  );
}
