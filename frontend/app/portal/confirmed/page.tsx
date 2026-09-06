"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { CheckCircle2, Eye, CreditCard, Loader2, AlertCircle, Package } from "lucide-react";

interface ConfirmedQuote {
  id: string;
  quoteNumber: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  fulfillmentStatus?: string;
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
    remainingBalance: number;
  } | null;
}

export default function CustomerConfirmedPage() {
  const [items, setItems] = useState<ConfirmedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfirmed = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ConfirmedQuote[]>("/customer-portal/quotations", {
        status: "CONFIRMED",
      });
      setItems(res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load confirmed agreements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfirmed();
  }, []);

  const formatCurrency = (amount: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
    }).format(amount);

  const columns: Column<ConfirmedQuote>[] = [
    {
      header: "Quotation #",
      render: (row) => (
        <Link href={`/portal/quotations/${row.id}`} className="font-bold text-[#0D69B2] hover:underline">
          {row.quoteNumber}
        </Link>
      ),
    },
    {
      header: "Confirmation Date",
      render: (row) => new Date(row.updatedAt || row.createdAt).toLocaleDateString(),
    },
    { header: "Line Items", accessorKey: "itemCount" },
    {
      header: "Final Total",
      render: (row) => formatCurrency(row.totalAmount, row.currency),
    },
    {
      header: "Fulfillment Status",
      render: (row) => {
        const st = row.fulfillmentStatus || "PROCESSING";
        return (
          <StatusBadge
            type={st === "FULFILLED" || st === "DELIVERED" ? "success" : st === "ALLOCATED" || st === "SHIPPED" ? "info" : "primary"}
            label={st}
          />
        );
      },
    },
    {
      header: "Payment Status",
      render: (row) => {
        if (!row.invoice) {
          return <span className="text-xs text-slate-400 font-medium">Processing Invoice</span>;
        }
        return (
          <StatusBadge
            type={row.invoice.status === "PAID" ? "success" : "warning"}
            label={row.invoice.status === "PAID" ? "PAID" : `Unpaid (₹${row.invoice.remainingBalance.toLocaleString()})`}
          />
        );
      },
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/portal/quotations/${row.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#0D69B2] hover:bg-blue-100 transition-colors"
          >
            <Eye size={14} />
            <span>Details</span>
          </Link>
          {row.invoice && row.invoice.remainingBalance > 0 && (
            <Link
              href={`/portal/invoices/${row.invoice.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
            >
              <CreditCard size={14} />
              <span>Pay Now</span>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Confirmed Agreements"
        title="Confirmed Orders & Agreements"
        description="View accepted commercial terms, order progress, and linked commercial invoices."
      />

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0D69B2]" />
            <p className="text-sm font-semibold text-slate-500">Loading confirmed agreements...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <CheckCircle2 size={36} className="mx-auto text-slate-400 opacity-50" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No Confirmed Orders Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You have no confirmed or fulfilled agreements. Review received quotations in "My Quotations" to confirm and initiate fulfillment.
            </p>
            <Link
              href="/portal/quotations"
              className="inline-block px-4 py-2 bg-[#0D69B2] text-white font-bold text-xs rounded-xl shadow-md"
            >
              View My Quotations
            </Link>
          </div>
        ) : (
          <DataTable columns={columns} data={items} />
        )}
      </div>
    </AppLayout>
  );
}
