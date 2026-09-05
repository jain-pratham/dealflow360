"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { apiClient } from "@/lib/api-client";
import {
  Clock,
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Warehouse as WarehouseIcon,
  Send,
  Layers,
} from "lucide-react";

interface BackorderItem {
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
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface InventoryItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  productId: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
}

export default function FinanceBackordersPage() {
  const [backorders, setBackorders] = useState<BackorderItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  // Fulfill Modal State
  const [selectedBackorder, setSelectedBackorder] = useState<BackorderItem | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [fulfillQuantity, setFulfillQuantity] = useState<number>(1);
  const [isFulfilling, setIsFulfilling] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchBackordersData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [boRes, whRes, invRes] = await Promise.all([
        apiClient.get<BackorderItem[]>("/backorders"),
        apiClient.get<Warehouse[]>("/warehouses"),
        apiClient.get<InventoryItem[]>("/inventory"),
      ]);

      if (boRes.error) throw new Error(boRes.error);
      setBackorders(boRes.data || []);

      if (whRes.data) {
        setWarehouses(whRes.data.filter((w) => w.isActive));
      }

      if (invRes.data) {
        setInventory(invRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load backorders data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackordersData();
  }, []);

  const handleOpenFulfillModal = (bo: BackorderItem) => {
    setSelectedBackorder(bo);
    setFulfillQuantity(bo.quantityPending);
    setSelectedWarehouseId("");
    setModalError(null);
    setSuccessMessage(null);
  };

  const handleFulfillBackorder = async () => {
    if (!selectedBackorder) return;
    setIsFulfilling(true);
    setModalError(null);
    setSuccessMessage(null);

    try {
      const payload: any = {
        quantity: fulfillQuantity,
      };
      if (selectedWarehouseId) {
        payload.warehouseId = selectedWarehouseId;
      }

      const res = await apiClient.post(`/backorders/${selectedBackorder.id}/fulfill`, payload);

      if (res.error) {
        throw new Error(res.error);
      }

      setSuccessMessage(`Successfully fulfilled ${fulfillQuantity} backordered units!`);
      setTimeout(() => {
        setSelectedBackorder(null);
        fetchBackordersData();
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || "Failed to fulfill backorder");
    } finally {
      setIsFulfilling(false);
    }
  };

  const columns: Column<BackorderItem>[] = [
    {
      header: "Backorder / Quote",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{row.quoteNumber}</div>
          <div className="text-xs text-slate-500 font-mono">{row.id.substring(0, 8)}...</div>
        </div>
      ),
    },
    {
      header: "Customer",
      accessorKey: "customerName",
      render: (row) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {row.customerName || "N/A"}
        </span>
      ),
    },
    {
      header: "Product Item",
      render: (row) => (
        <div>
          <div className="flex items-center space-x-1.5">
            <Package className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.productName}</span>
          </div>
          <span className="text-xs font-mono text-slate-500">{row.productSku}</span>
        </div>
      ),
    },
    {
      header: "Original / Pending Qty",
      render: (row) => (
        <div>
          <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
            {row.quantityPending} pending
          </span>
          <span className="text-xs text-slate-500 ml-1">
            (of {row.originalQuantity} orig)
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      render: (row) => {
        let type: "success" | "warning" | "info" | "danger" = "warning";
        if (row.status === "FULFILLED") type = "success";
        if (row.status === "PARTIALLY_FULFILLED") type = "info";
        return <StatusBadge type={type} label={row.status} />;
      },
    },
    {
      header: "Action",
      render: (row) => {
        if (row.status === "FULFILLED" || row.quantityPending <= 0) {
          return <span className="text-xs text-slate-400 font-medium">Completed</span>;
        }
        return (
          <button
            onClick={() => handleOpenFulfillModal(row)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Fulfill Stock</span>
          </button>
        );
      },
    },
  ];

  const filteredBackorders = backorders.filter((b) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      b.quoteNumber.toLowerCase().includes(term) ||
      b.productName.toLowerCase().includes(term) ||
      b.customerName.toLowerCase().includes(term)
    );
  });

  const totalPendingItems = backorders.reduce((sum, b) => sum + b.quantityPending, 0);

  return (
    <AppLayout>
      <PageHeader
        badgeText="Finance & Backorders Operations"
        title="Backorders & Stock Consolidation Queue"
        description="Track pending backorders, monitor stock replenishment, and clear backordered inventory allocations."
      />

      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Backorder Metrics Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white shadow-xl border border-amber-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-amber-600/20 text-amber-400 border border-amber-500/30">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {backorders.length} Active Backorder Queue Line{backorders.length === 1 ? "" : "s"}
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Total of <strong className="text-white">{totalPendingItems}</strong> units waiting for stock replenishment across active quotations.
                </p>
              </div>
            </div>

            <button
              onClick={fetchBackordersData}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Search backorders by quote #, customer, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading real backorder queue...</p>
          </div>
        ) : filteredBackorders.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <Layers className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No Backorders Pending</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              All quotation line items are fully satisfied by current warehouse inventory stock.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <DataTable columns={columns} data={filteredBackorders} />
          </div>
        )}
      </div>

      {/* FULFILL BACKORDER MODAL */}
      {selectedBackorder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-600">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Fulfill Pending Backorder</h3>
                <p className="text-xs text-slate-500">Quote: {selectedBackorder.quoteNumber} | Customer: {selectedBackorder.customerName}</p>
              </div>
            </div>

            {successMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{successMessage}</span>
              </div>
            )}

            {modalError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{modalError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div>Product: <strong className="text-slate-900 dark:text-slate-100">{selectedBackorder.productName}</strong> ({selectedBackorder.productSku})</div>
                <div>Pending Quantity: <strong className="text-amber-600">{selectedBackorder.quantityPending}</strong> units</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Warehouse (Optional - Auto-selects highest stock if empty):
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Auto-Select Warehouse with Stock</option>
                  {warehouses.map((wh) => {
                    const inv = inventory.find((i) => i.warehouseId === wh.id && i.productId === selectedBackorder.productId);
                    const avail = inv ? Math.max(0, inv.availableQuantity) : 0;
                    return (
                      <option key={wh.id} value={wh.id}>
                        {wh.code} - {wh.name} ({avail} available)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity to Fulfill:
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedBackorder.quantityPending}
                  value={fulfillQuantity}
                  onChange={(e) => setFulfillQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedBackorder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleFulfillBackorder}
                disabled={isFulfilling}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {isFulfilling && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Process Backorder Fulfillment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
