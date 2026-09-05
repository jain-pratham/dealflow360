"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { apiClient } from "@/lib/api-client";
import { CreditCard, DollarSign, FileCheck, AlertTriangle, TrendingUp, RefreshCw, Zap } from "lucide-react";

interface FinanceMetrics {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  monthlyRecurringRevenue: number;
  activeSubscriptionsCount: number;
  totalInvoicesCount: number;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  amount: number;
  paidAmount: number;
  remainingBalance: number;
  currency: string;
  status: string;
  dueDate: string;
  customer?: {
    companyName: string;
    name: string;
  };
}

export default function FinanceDashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [mRes, iRes] = await Promise.all([
        apiClient.get<FinanceMetrics>("/billing/metrics"),
        apiClient.get<InvoiceItem[]>("/billing/invoices", { limit: "10" }),
      ]);

      if (mRes.data) setMetrics(mRes.data);

      if (Array.isArray(iRes.data)) {
        setInvoices(iRes.data);
      } else if (iRes.data && (iRes.data as any).data) {
        setInvoices((iRes.data as any).data);
      }
    } catch {
      // fallback if API not reachable yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const columns: Column<InvoiceItem>[] = [
    {
      header: "Invoice Number",
      render: (row) => (
        <span className="font-bold text-[#0D69B2] dark:text-blue-400 font-mono text-xs sm:text-sm">
          {row.invoiceNumber}
        </span>
      ),
    },
    {
      header: "Customer Account",
      render: (row) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
          {row.customer?.companyName || row.customer?.name || "Customer"}
        </span>
      ),
    },
    {
      header: "Billing Type",
      render: (row) => (
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {row.invoiceType === "RECURRING_CYCLE" ? "Recurring" : "One-Time"}
        </span>
      ),
    },
    {
      header: "Gross Amount",
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-white font-mono">
          ₹{(row.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Remaining Balance",
      render: (row) => (
        <span
          className={`font-semibold font-mono ${
            row.remainingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          ₹{(row.remainingBalance || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Payment Status",
      render: (row) => (
        <StatusBadge
          type={
            row.status === "PAID"
              ? "success"
              : row.status === "PARTIALLY_PAID"
              ? "warning"
              : "danger"
          }
          label={row.status}
        />
      ),
    },
    {
      header: "Due Date",
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono">
          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Finance Controller Dashboard"
        title="High-Risk Approval & Invoice Performance"
        description={`Track live commercial invoicing revenue, pending balances, recurring subscriptions, and MRR. Logged in as ${user?.name || user?.email || "Finance Controller"}.`}
        actions={
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Invoiced Revenue
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">
              ₹{(metrics?.totalInvoiced || 0).toLocaleString()}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-[#0D69B2] flex items-center justify-center">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Payments Cleared
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
              ₹{(metrics?.totalPaid || 0).toLocaleString()}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <FileCheck size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending / Overdue Balance
            </div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
              ₹{(metrics?.totalPending || 0).toLocaleString()}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Monthly Recurring (MRR)
            </div>
            <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-1">
              ₹{(metrics?.monthlyRecurringRevenue || 0).toLocaleString()}/mo
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <CreditCard size={20} className="text-[#0D69B2]" />
          Recent Commercial Invoices & Collections Queue
        </h3>
        {loading ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-7 h-7 animate-spin text-[#0D69B2] mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Loading live financial data...</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={invoices}
            emptyMessage="No billing records currently in queue."
          />
        )}
      </div>
    </AppLayout>
  );
}
