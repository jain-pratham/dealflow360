"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { CreditCard, DollarSign, FileCheck, AlertTriangle } from "lucide-react";

interface InvoiceQueueItem {
  id: string;
  client: string;
  totalInvoice: string;
  marginPercent: string;
  riskLevel: "Low Risk" | "High Risk" | "Margin Alert";
  paymentStatus: "Pending Audit" | "Invoice Cleared" | "Overdue";
  dueDate: string;
}

export default function FinanceDashboardPage() {
  const { user } = useAuth();

  const [invoices, setInvoices] = useState<InvoiceQueueItem[]>([
    {
      id: "INV-8021",
      client: "Tata Communications",
      totalInvoice: "$85,000",
      marginPercent: "14.2%",
      riskLevel: "High Risk",
      paymentStatus: "Pending Audit",
      dueDate: "2026-09-15",
    },
    {
      id: "INV-8022",
      client: "Global Tech Solutions",
      totalInvoice: "$120,000",
      marginPercent: "28.5%",
      riskLevel: "Low Risk",
      paymentStatus: "Invoice Cleared",
      dueDate: "2026-09-02",
    },
    {
      id: "INV-8023",
      client: "Apex Health Networks",
      totalInvoice: "$32,000",
      marginPercent: "11.0%",
      riskLevel: "Margin Alert",
      paymentStatus: "Overdue",
      dueDate: "2026-08-30",
    },
  ]);

  const columns: Column<InvoiceQueueItem>[] = [
    { header: "Invoice ID", accessorKey: "id" },
    { header: "Client / Account", accessorKey: "client" },
    { header: "Gross Amount", accessorKey: "totalInvoice" },
    { header: "Calculated Margin", accessorKey: "marginPercent" },
    {
      header: "Risk Tier",
      render: (row) => (
        <StatusBadge
          type={
            row.riskLevel === "Low Risk"
              ? "success"
              : row.riskLevel === "High Risk"
              ? "danger"
              : "warning"
          }
          label={row.riskLevel}
        />
      ),
    },
    {
      header: "Payment Status",
      render: (row) => (
        <StatusBadge
          type={
            row.paymentStatus === "Invoice Cleared"
              ? "success"
              : row.paymentStatus === "Pending Audit"
              ? "primary"
              : "danger"
          }
          label={row.paymentStatus}
        />
      ),
    },
    { header: "Due Date", accessorKey: "dueDate" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Finance & Billing"
        title="High-Risk Approval & Invoice Queue"
        description={`Manage high margin risk approvals, invoices, and billing schedules. Logged in as ${user?.email || "Finance Controller"}.`}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Audit Invoices
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              $85,000
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-[#0D69B2] flex items-center justify-center">
            <CreditCard size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cleared Revenue
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              $120,000
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <FileCheck size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Margin Alerts
            </div>
            <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              1 Active
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <DollarSign size={20} className="text-[#0D69B2]" />
          Audit & Invoicing Queue
        </h3>
        <DataTable
          columns={columns}
          data={invoices}
          onView={(row) => alert(`Auditing invoice ${row.id}`)}
          onEdit={(row) => alert(`Modifying invoice ${row.id}`)}
        />
      </div>
    </AppLayout>
  );
}
