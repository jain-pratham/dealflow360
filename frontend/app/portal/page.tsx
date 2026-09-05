"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { FileText, CheckCircle, Clock, ShoppingBag, Eye, RefreshCw } from "lucide-react";

interface QuotationItem {
  id: string;
  quoteNumber: string;
  status: string;
  statusLabel: string;
  subtotalAmount: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CustomerPortalDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<QuotationItem[]>("/customer-portal/quotations");
      if (res.error) {
        setError(res.error);
      } else {
        setQuotations(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchQuotations();
    }
  }, [user]);

  const activeCount = quotations.filter((q) => q.status === "SENT").length;
  const negotiationCount = quotations.filter((q) => q.status === "UNDER_NEGOTIATION" || q.status === "PENDING_APPROVAL").length;
  const confirmedCount = quotations.filter((q) => q.status === "CONFIRMED").length;

  const totalContractValue = quotations
    .filter((q) => q.status === "CONFIRMED")
    .reduce((sum, q) => sum + q.totalAmount, 0);

  const columns: Column<QuotationItem>[] = [
    {
      header: "Quotation Ref",
      render: (row) => (
        <Link
          href={`/portal/quotations/${row.id}`}
          className="font-bold text-blue-600 hover:text-blue-500 underline decoration-blue-500/30"
        >
          {row.quoteNumber}
        </Link>
      ),
    },
    {
      header: "Date",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    { header: "Line Items", accessorKey: "itemCount" },
    {
      header: "Total Amount",
      render: (row) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: row.currency || "USD",
        }).format(row.totalAmount),
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={
            row.status === "CONFIRMED"
              ? "success"
              : row.status === "SENT"
              ? "primary"
              : "warning"
          }
          label={row.statusLabel}
        />
      ),
    },
    {
      header: "Actions",
      render: (row) => (
        <Link
          href={`/portal/quotations/${row.id}`}
          className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
        >
          <Eye size={14} />
          <span>View & Negotiate</span>
        </Link>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Customer Portal"
        title="Quotation Portal Overview"
        description={`Review, counter-negotiate, and confirm your sales quotations. Logged in as ${user?.email || "Customer"}.`}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Received
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {activeCount}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <FileText size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Under Negotiation
            </div>
            <div className="text-3xl font-extrabold text-amber-500 mt-1">
              {negotiationCount}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Confirmed Orders
            </div>
            <div className="text-3xl font-extrabold text-emerald-500 mt-1">
              {confirmedCount}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Confirmed Value
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: quotations[0]?.currency || "USD",
              }).format(totalContractValue)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <ShoppingBag size={22} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            My Active Quotations
          </h3>
          <button
            onClick={fetchQuotations}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            title="Refresh Quotations"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">
            Loading your quotations...
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <FileText size={40} className="mx-auto text-slate-400 mb-3 opacity-50" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No Quotations Found</h4>
            <p className="text-xs text-slate-500 mt-1">
              You do not have any active quotations ready for review at this time.
            </p>
          </div>
        ) : (
          <DataTable columns={columns} data={quotations} onRowClick={(row) => router.push(`/portal/quotations/${row.id}`)} />
        )}
      </div>
    </AppLayout>
  );
}
