"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  Layers,
  Box,
  Building2,
  Edit,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

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

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  // Adjust Stock Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [quantityOnHand, setQuantityOnHand] = useState<number>(10);
  const [quantityReserved, setQuantityReserved] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [saving, setSaving] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (selectedWarehouseId) params.warehouseId = selectedWarehouseId;

      const res = await apiClient.get<InventoryRecord[]>("/inventory", params);
      if (res.error) {
        setError(res.error);
      } else {
        setInventory(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [whRes, prodRes] = await Promise.all([
        apiClient.get<WarehouseOption[]>("/warehouses"),
        apiClient.get<ProductOption[]>("/products"),
      ]);
      if (whRes.data && Array.isArray(whRes.data)) setWarehouses(whRes.data);
      if (prodRes.data && Array.isArray(prodRes.data)) setProducts(prodRes.data);
    } catch {}
  };

  useEffect(() => {
    fetchInventory();
    fetchOptions();
  }, [search, selectedWarehouseId]);

  const handleOpenModal = (item?: InventoryRecord) => {
    if (item) {
      setFormWarehouseId(item.warehouseId);
      setFormProductId(item.productId);
      setQuantityOnHand(item.quantityOnHand);
      setQuantityReserved(item.quantityReserved);
      setReorderLevel(item.reorderLevel);
    } else {
      setFormWarehouseId(warehouses[0]?.id || "");
      setFormProductId(products[0]?.id || "");
      setQuantityOnHand(10);
      setQuantityReserved(0);
      setReorderLevel(10);
    }
    setIsModalOpen(true);
  };

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWarehouseId || !formProductId) return;

    setSaving(true);
    setError(null);

    try {
      const res = await apiClient.patch("/inventory", {
        warehouseId: formWarehouseId,
        productId: formProductId,
        quantityOnHand: Number(quantityOnHand),
        quantityReserved: Number(quantityReserved),
        reorderLevel: Number(reorderLevel),
      });

      if (res.error) {
        setError(res.error);
      } else {
        setIsModalOpen(false);
        fetchInventory();
      }
    } catch (err: any) {
      setError(err.message || "Failed to adjust inventory.");
    } finally {
      setSaving(false);
    }
  };

  const totalOnHand = inventory.reduce((sum, i) => sum + i.quantityOnHand, 0);
  const totalReserved = inventory.reduce((sum, i) => sum + i.quantityReserved, 0);
  const totalAvailable = inventory.reduce((sum, i) => sum + i.availableQuantity, 0);

  const columns: Column<InventoryRecord>[] = [
    {
      header: "Product Item",
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white">{row.productName}</div>
          <div className="text-[11px] text-slate-400">SKU: {row.productSku}</div>
        </div>
      ),
    },
    {
      header: "Warehouse Hub",
      render: (row) => (
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          {row.warehouseName} ({row.warehouseCode || "HUB"})
        </span>
      ),
    },
    {
      header: "Quantity On Hand",
      accessorKey: "quantityOnHand",
    },
    {
      header: "Reserved Stock",
      render: (row) => (
        <span className="text-amber-500 font-semibold">{row.quantityReserved}</span>
      ),
    },
    {
      header: "Available Stock",
      render: (row) => (
        <span
          className={`font-extrabold ${
            row.availableQuantity <= row.reorderLevel
              ? "text-red-500"
              : "text-emerald-500"
          }`}
        >
          {row.availableQuantity}
        </span>
      ),
    },
    {
      header: "Reorder Threshold",
      accessorKey: "reorderLevel",
    },
    {
      header: "Actions",
      render: (row) => (
        <button
          onClick={() => handleOpenModal(row)}
          className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
        >
          <Edit size={14} />
          <span>Adjust Stock</span>
        </button>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Realtime Inventory Control"
        title="Physical Inventory & Stock Levels"
        description="Monitor physical stock on hand, reservations, and calculated available inventory across regional hubs."
        actions={
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Update / Add Stock</span>
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total SKUs Tracked
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {inventory.length}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Layers size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              On-Hand Physical Stock
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {totalOnHand}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Box size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Reserved for Fulfillments
            </div>
            <div className="text-3xl font-extrabold text-amber-500 mt-1">
              {totalReserved}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Layers size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Available for New Deals
            </div>
            <div className="text-3xl font-extrabold text-emerald-500 mt-1">
              {totalAvailable}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Table & Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="">All Warehouse Hubs</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code || "HUB"})
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search product name or SKU..."
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
          <div className="p-12 text-center text-slate-400 font-medium">Loading inventory records...</div>
        ) : (
          <DataTable columns={columns} data={inventory} onRowClick={(row) => handleOpenModal(row)} />
        )}
      </div>

      {/* Modal: Adjust Stock */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Box size={20} className="text-blue-500" />
              Adjust Stock Level
            </h3>

            <form onSubmit={handleSaveInventory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Warehouse Hub
                </label>
                <select
                  value={formWarehouseId}
                  onChange={(e) => setFormWarehouseId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code || "HUB"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Product Item
                </label>
                <select
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (SKU: {p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Quantity On Hand
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quantityOnHand}
                    onChange={(e) => setQuantityOnHand(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Reserved Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quantityReserved}
                    onChange={(e) => setQuantityReserved(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Reorder Level Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(parseInt(e.target.value) || 10)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center space-x-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Save Stock Level</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
