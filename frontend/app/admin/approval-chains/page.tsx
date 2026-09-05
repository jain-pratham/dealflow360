"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";

export default function ApprovalChainsPage() {
  return (
    <AppLayout>
      <PageHeader
        badgeText="Workflow Configuration"
        title="Approval Chain Orchestration"
        description="Define sequential approval hierarchies for high-value sales deals and custom discount exceptions."
      />
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Approval Escalation Chains</h3>
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Tier 1: Standard Manager Approval</div>
              <div className="text-xs text-slate-500">Triggered when Rep discount exceeds category baseline (e.g. &gt; 10%)</div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">SALES_MANAGER</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Tier 2: Finance High-Risk Governance</div>
              <div className="text-xs text-slate-500">Triggered when Rep discount exceeds manager ceiling or margin falls below 15%</div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-pink-500/10 text-pink-600 dark:text-pink-400">FINANCE</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
