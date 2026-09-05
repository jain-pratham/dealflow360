"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { Layers, Search, RefreshCw, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface InventoryRecord {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode?: string;
  productId: string;
  productName: string;
  productSku: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  reorderLevel: number;
  updatedAt: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code?: string;
}

type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

function getStockStatus(item: InventoryRecord): StockStatus {
  if (item.availableQuantity <= 0) return "OUT_OF_STOCK";
  if (item.availableQuantity <= item.reorderLevel) return "LOW_STOCK";
  return "IN_STOCK";
}

export default function SalesInventoryPage() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (selectedWarehouseId) params.warehouseId = selectedWarehouseId;
      const res = await apiClient.get<InventoryRecord[]>("/inventory", params);
      if (res.error) setError(res.error);
      else setInventory(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    apiClient.get<WarehouseOption[]>("/warehouses").then((res) => {
      if (res.data && Array.isArray(res.data)) setWarehouses(res.data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedWarehouseId]);

  const filteredInventory = inventory.filter((item) => {
    if (!statusFilter) return true;
    return getStockStatus(item) === statusFilter;
  });

  const totalAvailable = inventory.reduce((s, i) => s + i.availableQuantity, 0);
  const inStockCount = inventory.filter((i) => getStockStatus(i) === "IN_STOCK").length;
  const lowOrOutCount = inventory.filter((i) => getStockStatus(i) !== "IN_STOCK").length;

  const columns: Column<InventoryRecord>[] = [
    {
      header: "Product",
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">{row.productName}</div>
          <div className="text-[11px] text-slate-400 font-mono">SKU: {row.productSku}</div>
        </div>
      ),
    },
    {
      header: "Warehouse",
      render: (row) => (
        <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
          {row.warehouseCode || "HUB"} — {row.warehouseName}
        </span>
      ),
    },
    {
      header: "Available Stock",
      render: (row) => {
        const avail = row.availableQuantity;
        const isLow = avail <= row.reorderLevel && avail > 0;
        const isOut = avail <= 0;
        return (
          <span className={`font-extrabold text-base ${isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
            {avail}
          </span>
        );
      },
    },
    {
      header: "Reorder Threshold",
      render: (row) => <span className="text-xs text-slate-500">{row.reorderLevel}</span>,
    },
    {
      header: "Status",
      render: (row) => {
        const s = getStockStatus(row);
        return (
          <StatusBadge
            type={s === "IN_STOCK" ? "success" : s === "LOW_STOCK" ? "warning" : "danger"}
            label={s.replace("_", " ")}
          />
        );
      },
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Stock Availability (Read Only)"
        title="Warehouse Stock Availability"
        description="View live stock availability across all warehouse hubs. Contact Finance or Operations to adjust inventory levels."
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Available</div>
            <div className="text-2xl font-extrabold mt-0.5 text-emerald-600">{totalAvailable}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><CheckCircle2 size={20} /></div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">In Stock Lines</div>
            <div className="text-2xl font-extrabold mt-0.5 text-blue-600">{inStockCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center"><Layers size={20} /></div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Low / Out of Stock</div>
            <div className="text-2xl font-extrabold mt-0.5 text-amber-600">{lowOrOutCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center"><AlertTriangle size={20} /></div>
        </div>
      </div>

      <div className="p-3 mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 font-medium">
        📦 This is a <strong>read-only view</strong>. Only Finance & Admin can adjust stock levels. Availability shown is live from the warehouse system.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search product or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={selectedWarehouseId}
          onChange={(e) => setSelectedWarehouseId(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code || "HUB"})</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
        <button
          onClick={fetchInventory}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center space-x-1.5"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="p-4 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm">{error}</div>}

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          Loading stock availability...
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300">No Inventory Records Found</h4>
          <p className="text-sm text-slate-500 mt-1">No inventory items match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <DataTable columns={columns} data={filteredInventory} />
        </div>
      )}
    </AppLayout>
  );
}
