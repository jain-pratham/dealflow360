"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { apiClient } from "@/lib/api-client";
import {
  Search,
  RefreshCw,
  Pause,
  Play,
  XCircle,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
  Calendar,
  Zap,
} from "lucide-react";

interface SubSchedule {
  id: string;
  quotationId: string;
  productId: string;
  planId: string;
  billingCycle: string;
  startDate: string;
  nextBillingDate: string;
  unitPrice: number;
  quantity: number;
  currency: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";
  cancellationDate?: string;
  product?: {
    name: string;
    sku: string;
  };
  plan?: {
    name: string;
    interval: string;
  };
  quotation?: {
    quoteNumber: string;
    customer?: {
      companyName: string;
      name: string;
      contactEmail: string;
    };
  };
}

export default function FinanceSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await apiClient.get<SubSchedule[]>("/subscriptions", params);
      if (Array.isArray(res.data)) {
        setSubscriptions(res.data);
      } else if (res.data && (res.data as any).data) {
        setSubscriptions((res.data as any).data);
      }
    } catch {
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [search, statusFilter]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePause = async (sub: SubSchedule) => {
    const res = await apiClient.post(`/subscriptions/${sub.id}/pause`, {});
    if (res.data) {
      showToast("success", `Subscription for '${sub.product?.name}' PAUSED successfully.`);
      fetchSubscriptions();
    } else {
      showToast("error", res.error || "Failed to pause subscription.");
    }
  };

  const handleResume = async (sub: SubSchedule) => {
    const res = await apiClient.post(`/subscriptions/${sub.id}/resume`, {});
    if (res.data) {
      showToast("success", `Subscription for '${sub.product?.name}' RESUMED successfully.`);
      fetchSubscriptions();
    } else {
      showToast("error", res.error || "Failed to resume subscription.");
    }
  };

  const handleCancel = async (sub: SubSchedule) => {
    if (!confirm(`Are you sure you want to CANCEL subscription for '${sub.product?.name}'?`)) return;
    const res = await apiClient.post(`/subscriptions/${sub.id}/cancel`, {});
    if (res.data) {
      showToast("success", `Subscription for '${sub.product?.name}' CANCELLED.`);
      fetchSubscriptions();
    } else {
      showToast("error", res.error || "Failed to cancel subscription.");
    }
  };

  const handleProcessRecurringBilling = async () => {
    setIsProcessingRecurring(true);
    const res = await apiClient.post<{ message: string; generatedInvoicesCount: number }>("/subscriptions/process-recurring-billing", {});
    if (res.data) {
      showToast(
        "success",
        `Recurring Billing Processed: ${res.data.generatedInvoicesCount} invoices generated automatically.`,
      );
      fetchSubscriptions();
    } else {
      showToast("error", res.error || "Failed to process recurring billing.");
    }
    setIsProcessingRecurring(false);
  };

  const columns: Column<SubSchedule>[] = [
    {
      header: "Product / Plan",
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
            {row.product?.name || "Subscription Product"}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {row.plan?.name || "Monthly Plan"} ({row.billingCycle})
          </div>
        </div>
      ),
    },
    {
      header: "Customer Account",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
            {row.quotation?.customer?.companyName || row.quotation?.customer?.name || "Customer Account"}
          </div>
          <div className="text-[11px] text-slate-400">Quote: {row.quotation?.quoteNumber}</div>
        </div>
      ),
    },
    {
      header: "Recurring Rate",
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
          ₹{row.unitPrice.toLocaleString()}/{row.billingCycle.toLowerCase()}
        </span>
      ),
    },
    {
      header: "Next Billing Date",
      render: (row) => (
        <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-xs">
          {new Date(row.nextBillingDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={
            row.status === "ACTIVE"
              ? "success"
              : row.status === "PAUSED"
              ? "warning"
              : "danger"
          }
          label={row.status}
        />
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === "ACTIVE" && (
            <button
              onClick={() => handlePause(row)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
              title="Pause Subscription"
            >
              <Pause size={12} />
              <span>Pause</span>
            </button>
          )}

          {row.status === "PAUSED" && (
            <button
              onClick={() => handleResume(row)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
              title="Resume Subscription"
            >
              <Play size={12} />
              <span>Resume</span>
            </button>
          )}

          {row.status !== "CANCELLED" && (
            <button
              onClick={() => handleCancel(row)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
              title="Cancel Subscription"
            >
              <XCircle size={12} />
              <span>Cancel</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
            toastMessage.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-700"
              : "bg-rose-900 text-rose-100 border-rose-700"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <PageHeader
        badgeText="Recurring Revenue & Subscriptions"
        title="Subscription Schedule Management"
        description="Monitor automated recurring billing cycles, pause/resume active subscriber accounts, and run background billing."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleProcessRecurringBilling}
              disabled={isProcessingRecurring}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-[#0D69B2] hover:bg-[#0b5a99] px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Zap size={14} className={isProcessingRecurring ? "animate-spin" : ""} />
              <span>Run Recurring Billing Engine</span>
            </button>
            <button
              onClick={fetchSubscriptions}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Toolbar & Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, customer or quote..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Subscriptions Data Table */}
        {loading ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-7 h-7 animate-spin text-[#0D69B2] mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Loading subscription schedules...</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={subscriptions}
            emptyMessage="No subscription schedules found matching criteria."
          />
        )}
      </div>
    </AppLayout>
  );
}
