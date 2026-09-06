"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { MessageSquare, ChevronRight, Loader2, AlertCircle, Clock } from "lucide-react";

interface NegotiationItem {
  id: string;
  quoteNumber: string;
  status: string;
  statusLabel: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CustomerNegotiationPage() {
  const [items, setItems] = useState<NegotiationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNegotiations = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both UNDER_NEGOTIATION and PENDING_APPROVAL quotations
      const [negRes, appRes] = await Promise.all([
        apiClient.get<NegotiationItem[]>("/customer-portal/quotations", { status: "UNDER_NEGOTIATION" }),
        apiClient.get<NegotiationItem[]>("/customer-portal/quotations", { status: "PENDING_APPROVAL" }),
      ]);

      const list1 = negRes.data || [];
      const list2 = appRes.data || [];

      // Combine and deduplicate by id
      const map = new Map<string, NegotiationItem>();
      [...list1, ...list2].forEach((item) => map.set(item.id, item));

      setItems(Array.from(map.values()));
    } catch (err: any) {
      setError(err.message || "Failed to load active negotiations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNegotiations();
  }, []);

  const formatCurrency = (amount: number, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
    }).format(amount);

  const columns: Column<NegotiationItem>[] = [
    {
      header: "Quotation Ref",
      render: (row) => (
        <Link
          href={`/portal/quotations/${row.id}`}
          className="font-bold text-[#0D69B2] hover:underline"
        >
          {row.quoteNumber}
        </Link>
      ),
    },
    {
      header: "Date Updated",
      render: (row) => new Date(row.updatedAt || row.createdAt).toLocaleDateString(),
    },
    { header: "Line Items", accessorKey: "itemCount" },
    {
      header: "Current Value",
      render: (row) => formatCurrency(row.totalAmount, row.currency),
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={row.status === "PENDING_APPROVAL" ? "warning" : "primary"}
          label={row.statusLabel}
        />
      ),
    },
    {
      header: "Action",
      render: (row) => (
        <Link
          href={`/portal/quotations/${row.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0D69B2] hover:underline bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg"
        >
          <span>Manage Negotiation</span>
          <ChevronRight size={14} />
        </Link>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Active Negotiation"
        title="Proposals Under Active Negotiation"
        description="Track commercial proposals with active counter-discounts, line-level comments, and manager review status."
      />

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0D69B2]" />
            <p className="text-sm font-semibold text-slate-500">Loading active negotiations...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <MessageSquare size={36} className="mx-auto text-slate-400 opacity-50" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No Proposals Under Negotiation</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You currently have no active counter-offers or pending negotiation reviews. Check "My Quotations" for received proposals.
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
