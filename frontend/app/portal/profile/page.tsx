"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/context/auth-context";

export default function CustomerProfilePage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <PageHeader
        badgeText="Account Details"
        title="Customer Profile & Organization Settings"
        description="View customer contact details, tier classification, and assigned account manager."
      />
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white">Organization Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold uppercase block">Account Name</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Acme Logistics Corp</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase block">Registered Email</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{user?.email || "customer@dealflow360.com"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase block">Customer Tier</span>
            <span className="font-bold text-[#F4882E]">GOLD TIER</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase block">Assigned Rep</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">Sales Representative</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
