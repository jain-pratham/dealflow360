"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { ShoppingBag, FileText, CheckCircle, Clock } from "lucide-react";

interface CustomerQuote {
  id: string;
  vendor: string;
  itemsCount: number;
  totalAmount: string;
  validUntil: string;
  status: "Received" | "Accepted" | "Under Negotiation";
}

export default function CustomerPortalPage() {
  const { user } = useAuth();

  const [customerQuotes, setCustomerQuotes] = useState<CustomerQuote[]>([
    {
      id: "Q-2026-001",
      vendor: "DealFlow360 Enterprise Solutions",
      itemsCount: 5,
      totalAmount: "$48,500",
      validUntil: "2026-09-30",
      status: "Received",
    },
    {
      id: "Q-2026-002",
      vendor: "DealFlow360 Logistics Hub",
      itemsCount: 12,
      totalAmount: "$120,000",
      validUntil: "2026-10-15",
      status: "Accepted",
    },
  ]);

  const columns: Column<CustomerQuote>[] = [
    { header: "Quotation Ref", accessorKey: "id" },
    { header: "Vendor Name", accessorKey: "vendor" },
    { header: "Line Items", accessorKey: "itemsCount" },
    { header: "Total Amount", accessorKey: "totalAmount" },
    { header: "Valid Until", accessorKey: "validUntil" },
    {
      header: "Quotation Status",
      render: (row) => (
        <StatusBadge
          type={
            row.status === "Accepted"
              ? "success"
              : row.status === "Received"
              ? "primary"
              : "warning"
          }
          label={row.status}
        />
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Customer Portal"
        title="My Quotations & Orders"
        description={`View, accept, and negotiate your active sales quotations. Logged in as ${user?.email || "Customer Account"}.`}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Quotations
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              2
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-[#0D69B2] flex items-center justify-center">
            <FileText size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Accepted Orders
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              1
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Contract Total
            </div>
            <div className="text-3xl font-extrabold text-[#F4882E] mt-1">
              $168,500
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#F4882E]/10 text-[#F4882E] flex items-center justify-center">
            <ShoppingBag size={22} />
          </div>
        </div>
      </div>

      {/* Customer Quotations Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <FileText size={20} className="text-[#0D69B2]" />
          My Received Quotations
        </h3>
        <DataTable
          columns={columns}
          data={customerQuotes}
          onView={(row) => alert(`Viewing quotation details: ${row.id}`)}
        />
      </div>
    </AppLayout>
  );
}
