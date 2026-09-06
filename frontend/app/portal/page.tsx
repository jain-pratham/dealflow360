"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/DataTable";
import {
  FileText,
  Clock,
  MessageSquare,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Eye,
  Loader2,
  AlertTriangle,
  TrendingUp,
  CreditCard,
} from "lucide-react";

interface DashboardData {
  totalQuotations: number;
  actionRequiredCount: number;
  underNegotiationCount: number;
  confirmedCount: number;
  outstandingInvoiceAmount: number;
  recentActivity: Array<{
    id: string;
    quoteNumber: string;
    action: string;
    reason?: string;
    timestamp: string;
  }>;
  recentQuotations: Array<{
    id: string;
    quoteNumber: string;
    status: string;
    statusLabel: string;
    totalAmount: number;
    currency: string;
    itemCount: number;
    createdAt: string;
    updatedAt: string;
    invoice?: {
      id: string;
      invoiceNumber: string;
      status: string;
      remainingBalance: number;
    } | null;
  }>;
}

export default function CustomerPortalDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<DashboardData>("/customer-portal/dashboard");
      if (res.data) {
        setData(res.data);
      } else if (res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatCurrency = (amount: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#0D69B2]" />
          <p className="text-sm font-semibold text-slate-500">Loading customer dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Dashboard Unavailable</h3>
          <p className="text-xs text-slate-500">{error || "Failed to fetch customer data."}</p>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 bg-[#0D69B2] text-white text-xs font-bold rounded-xl shadow-md"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        badgeText="Customer Portal"
        title="Customer Dashboard"
        description="Overview of active commercial proposals, ongoing negotiations, confirmed agreements, and billing."
      />

      <div className="space-y-6">
        {/* KPI CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            href="/portal/quotations"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-[#0D69B2] transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Total Quotations
              </span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0D69B2] group-hover:scale-110 transition-transform">
                <FileText size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {data.totalQuotations}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-[#0D69B2] flex items-center gap-0.5">
                View <ArrowRight size={12} />
              </span>
            </div>
          </Link>

          <Link
            href="/portal/quotations?status=SENT"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-500 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500">
                Action Required
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 group-hover:scale-110 transition-transform">
                <Clock size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {data.actionRequiredCount}
              </span>
              <span className="text-[11px] font-semibold text-amber-500 flex items-center gap-0.5">
                Review <ArrowRight size={12} />
              </span>
            </div>
          </Link>

          <Link
            href="/portal/negotiation"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-500 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-500">
                Under Negotiation
              </span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-500 group-hover:scale-110 transition-transform">
                <MessageSquare size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {data.underNegotiationCount}
              </span>
              <span className="text-[11px] font-semibold text-purple-500 flex items-center gap-0.5">
                Track <ArrowRight size={12} />
              </span>
            </div>
          </Link>

          <Link
            href="/portal/confirmed"
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500 transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-500">
                Confirmed Orders
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {data.confirmedCount}
              </span>
              <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-0.5">
                View <ArrowRight size={12} />
              </span>
            </div>
          </Link>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Outstanding Balance
              </span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-500">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(data.outstandingInvoiceAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* MAIN SECTION: RECENT QUOTATIONS & ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Quotations Table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-[#0D69B2]" />
                Recent Quotations
              </h3>
              <Link
                href="/portal/quotations"
                className="text-xs font-bold text-[#0D69B2] hover:underline flex items-center gap-1"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            {(data?.recentQuotations || []).length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                No active quotations found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Quotation Ref</th>
                      <th className="px-4 py-3">Issued Date</th>
                      <th className="px-4 py-3">Total Value</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(data?.recentQuotations || []).map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-bold text-[#0D69B2]">
                          <Link href={`/portal/quotations/${q.id}`} className="hover:underline">
                            {q.quoteNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white font-mono">
                          {formatCurrency(q.totalAmount, q.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            type={
                              q.status === "CONFIRMED"
                                ? "success"
                                : q.status === "SENT"
                                ? "primary"
                                : "warning"
                            }
                            label={q.statusLabel}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/portal/quotations/${q.id}`}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0D69B2] hover:bg-blue-100 font-semibold flex items-center gap-1"
                            >
                              <Eye size={12} /> View
                            </Link>
                            {q.invoice && q.invoice.remainingBalance > 0 && (
                              <Link
                                href={`/portal/invoices/${q.invoice.id}`}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 shadow-xs"
                              >
                                <CreditCard size={12} /> Pay
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#0D69B2]" />
              Recent Activity & Audit
            </h3>

            {(data?.recentActivity || []).length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {(data?.recentActivity || []).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span className="text-[#0D69B2]">{log.quoteNumber}</span>
                      <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</p>
                    {log.reason && <p className="text-slate-500 text-[11px]">{log.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
