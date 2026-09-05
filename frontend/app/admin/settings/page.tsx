"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";

export default function AdminSettingsPage() {
  return (
    <AppLayout>
      <PageHeader
        badgeText="System Controls"
        title="Platform & Security Settings"
        description="Configure system-wide settings, authentication providers, and audit log policies."
      />
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Platform Configurations</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Email Verification Requirement</div>
              <div className="text-xs text-slate-500">Enforce email token verification prior to full portal access</div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">ENABLED</span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Audit Trail Logging</div>
              <div className="text-xs text-slate-500">Record all quotation status transitions and discount overrides</div>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">ACTIVE</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
