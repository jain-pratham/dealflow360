"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  Send,
  Loader2,
  Box,
} from "lucide-react";

interface BackorderRecord {
  id: string;
  quotationId: string;
  quoteNumber: string;
  customerName: string;
  productId: string;
  productName: string;
  productSku: string;
  originalQuantity: number;
  quantityPending: number;
  fulfilledQuantity: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code?: string;
}

export default function BackordersManagementPage() {
  const [backorders, setBackorders] = useState<BackorderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Fulfill Modal State
  const [selectedBackorder, setSelectedBackorder] = useState<BackorderRecord | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>("");
  const [fulfillQty, setFulfillQty] = useState<number>(1);
  const [fulfilling, setFulfilling] = useState(false);

  const fetchBackorders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await apiClient.get<BackorderRecord[]>("/backorders", params);
      if (res.error) {
        setError(res.error);
      } else {
        setBackorders(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load backorders.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const res = await apiClient.get<WarehouseOption[]>("/warehouses");
      if (res.data) {
        setWarehouses(res.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchBackorders();
    fetchWarehouses();
  }, [search, statusFilter]);

  const handleFulfillBackorder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBackorder) return;

    setFulfilling(true);
    setError(null);
    try {
      const payload: any = { quantity: Number(fulfillQty) };
      if (targetWarehouseId) payload.warehouseId = targetWarehouseId;

      const res = await apiClient.post(`/backorders/${selectedBackorder.id}/fulfill`, payload);
      if (res.error) {
        setError(res.error);
      } else {
        setSelectedBackorder(null);
        fetchBackorders();
      }
    } catch (err: any) {
      setError(err.message || "Failed to fulfill backorder.");
    } finally {
      setFulfilling(false);
    }
  };

  const totalBackorderRecords = backorders.length;
  const openBackorders = backorders.filter(
    (b) => b.status === "WAITING_FOR_STOCK" || b.status === "OPEN"
  ).length;
  const partialBackorders = backorders.filter((b) => b.status === "PARTIALLY_FULFILLED").length;
  const fulfilledBackorders = backorders.filter((b) => b.status === "FULFILLED").length;

  const columns: Column<BackorderRecord>[] = [
    {
      header: "Quotation Ref",
      accessorKey: "quoteNumber",
    },
    {
      header: "Customer",
      accessorKey: "customerName",
    },
    {
      header: "Product / SKU",
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">{row.productName}</div>
          <div className="text-[11px] text-slate-400">SKU: {row.productSku}</div>
        </div>
      ),
    },
    {
      header: "Original Qty",
      accessorKey: "originalQuantity",
    },
    {
      header: "Quantity Pending",
      render: (row) => (
        <span className="font-extrabold text-amber-500">{row.quantityPending}</span>
      ),
    },
    {
      header: "Fulfilled Qty",
      accessorKey: "fulfilledQuantity",
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={
            row.status === "FULFILLED"
              ? "success"
              : row.status === "PARTIALLY_FULFILLED"
              ? "primary"
              : "warning"
          }
          label={row.status}
        />
      ),
    },
    {
      header: "Actions",
      render: (row) =>
        row.status !== "FULFILLED" && row.quantityPending > 0 ? (
          <button
            onClick={() => {
              setSelectedBackorder(row);
              setFulfillQty(row.quantityPending);
            }}
            className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
          >
            <Box size={14} />
            <span>Fulfill Stock</span>
          </button>
        ) : (
          <span className="text-xs text-slate-400 italic">Fully Resolved</span>
        ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Inventory Management"
        title="Backorders & Replenishment Queue"
        description="Monitor unfulfilled quotation line items and allocate newly replenished warehouse stock."
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Backorders
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {totalBackorderRecords}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Package size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Stock
            </div>
            <div className="text-3xl font-extrabold text-amber-500 mt-1">
              {openBackorders}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Partially Fulfilled
            </div>
            <div className="text-3xl font-extrabold text-indigo-500 mt-1">
              {partialBackorders}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Box size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fully Resolved
            </div>
            <div className="text-3xl font-extrabold text-emerald-500 mt-1">
              {fulfilledBackorders}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold text-slate-500">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("WAITING_FOR_STOCK")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === "WAITING_FOR_STOCK"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Open Stock
              </button>
              <button
                onClick={() => setStatusFilter("PARTIALLY_FULFILLED")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === "PARTIALLY_FULFILLED"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Partial
              </button>
              <button
                onClick={() => setStatusFilter("FULFILLED")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === "FULFILLED"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Fulfilled
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search quotation or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading backorders...</div>
        ) : backorders.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Package size={40} className="mx-auto text-slate-400 mb-3 opacity-50" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No Backorders Found</h4>
          </div>
        ) : (
          <DataTable columns={columns} data={backorders} onRowClick={(row) => setSelectedBackorder(row)} />
        )}
      </div>

      {/* Modal: Fulfill Backorder */}
      {selectedBackorder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Box size={20} className="text-emerald-500" />
              Fulfill Backordered Stock
            </h3>
            <p className="text-xs text-slate-500">
              Allocate newly available inventory for <span className="font-bold text-white">{selectedBackorder.productName}</span> on quotation <span className="font-bold text-white">{selectedBackorder.quoteNumber}</span>.
            </p>

            <form onSubmit={handleFulfillBackorder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Source Warehouse (Auto-selected if empty)
                </label>
                <select
                  value={targetWarehouseId}
                  onChange={(e) => setTargetWarehouseId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Auto-select warehouse with available stock</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code || "HUB"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Quantity to Fulfill (Pending: {selectedBackorder.quantityPending})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedBackorder.quantityPending}
                  value={fulfillQty}
                  onChange={(e) => setFulfillQty(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBackorder(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fulfilling}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center space-x-2"
                >
                  {fulfilling ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  <span>Fulfill Backorder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
