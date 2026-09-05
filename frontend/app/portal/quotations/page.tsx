"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { FileText, Eye, Search, Filter } from "lucide-react";

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

export default function MyQuotationsPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (activeTab !== "ALL") params.status = activeTab;

      const res = await apiClient.get<QuotationItem[]>("/customer-portal/quotations", params);
      setQuotations(res.data || []);
    } catch {
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [search, activeTab]);

  const columns: Column<QuotationItem>[] = [
    {
      header: "Quotation Ref",
      render: (row) => (
        <Link
          href={`/portal/quotations/${row.id}`}
          className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
        >
          {row.quoteNumber}
        </Link>
      ),
    },
    {
      header: "Date Issued",
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
          <span>View Details</span>
        </Link>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Customer Portal"
        title="My Quotations"
        description="View and track all quotations sent to your organization."
      />

      <div className="space-y-4">
        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold text-slate-500">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("SENT")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "SENT"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => setActiveTab("UNDER_NEGOTIATION")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "UNDER_NEGOTIATION"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Under Negotiation
            </button>
            <button
              onClick={() => setActiveTab("CONFIRMED")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "CONFIRMED"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Confirmed
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search quotation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading quotations...</div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <FileText size={40} className="mx-auto text-slate-400 mb-3 opacity-50" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No Quotations Found</h4>
          </div>
        ) : (
          <DataTable columns={columns} data={quotations} />
        )}
      </div>
    </AppLayout>
  );
}
