"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  Layers,
  Box,
  Edit,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Settings2,
  History,
  ChevronDown,
  ChevronUp,
  ArrowRight,
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

interface AdjustmentRecord {
  id: string;
  type: "INCREASE" | "DECREASE" | "SET";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  adjustedBy: string;
  adjustedByRole: string;
  createdAt: string;
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

type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

function getStockStatus(item: InventoryRecord): StockStatus {
  if (item.availableQuantity <= 0) return "OUT_OF_STOCK";
  if (item.availableQuantity <= item.reorderLevel) return "LOW_STOCK";
  return "IN_STOCK";
}

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  // Adjust Stock Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryRecord | null>(null);
  const [adjustType, setAdjustType] = useState<"INCREASE" | "DECREASE" | "SET">("INCREASE");
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState("");
  // For "Add New Stock" (SET on a new product/warehouse combo using legacy PATCH)
  const [isNewStock, setIsNewStock] = useState(false);
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formQuantityOnHand, setFormQuantityOnHand] = useState<number>(10);
  const [formReorderLevel, setFormReorderLevel] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Adjustment History
  const [historyItem, setHistoryItem] = useState<InventoryRecord | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

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
        setInventory(Array.isArray(res.data) ? res.data : []);
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
        apiClient.get<any>("/products"),
      ]);
      if (whRes.data && Array.isArray(whRes.data)) setWarehouses(whRes.data);
      // Products endpoint is paginated: { data: [], meta: {} }
      const prodArray = Array.isArray(prodRes.data)
        ? prodRes.data
        : Array.isArray((prodRes.data as any)?.data)
        ? (prodRes.data as any).data
        : [];
      setProducts(prodArray);
    } catch {}
  };

  useEffect(() => {
    fetchInventory();
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedWarehouseId]);

  const filteredInventory = inventory.filter((item) => {
    if (!statusFilter) return true;
    return getStockStatus(item) === statusFilter;
  });

  const handleOpenAdjustModal = (item: InventoryRecord) => {
    setSelectedItem(item);
    setAdjustType("INCREASE");
    setAdjustQty(1);
    setAdjustReason("");
    setModalError(null);
    setModalSuccess(null);
    setIsNewStock(false);
    setIsModalOpen(true);
  };

  const handleOpenNewStockModal = () => {
    setSelectedItem(null);
    setIsNewStock(true);
    setFormWarehouseId(warehouses[0]?.id || "");
    setFormProductId(products[0]?.id || "");
    setFormQuantityOnHand(10);
    setFormReorderLevel(10);
    setModalError(null);
    setModalSuccess(null);
    setIsModalOpen(true);
  };

  const handleSaveNewStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWarehouseId || !formProductId) return;
    setSaving(true);
    setModalError(null);
    try {
      const res = await apiClient.patch("/inventory", {
        warehouseId: formWarehouseId,
        productId: formProductId,
        quantityOnHand: Number(formQuantityOnHand),
        quantityReserved: 0,
        reorderLevel: Number(formReorderLevel),
      });
      if (res.error) {
        setModalError(res.error);
      } else {
        setModalSuccess("Stock initialized successfully!");
        setTimeout(() => { setIsModalOpen(false); fetchInventory(); }, 800);
      }
    } catch (err: any) {
      setModalError(err.message || "Failed to initialize stock.");
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSaving(true);
    setModalError(null);
    setModalSuccess(null);
    try {
      const res = await apiClient.post(`/inventory/${selectedItem.id}/adjust`, {
        type: adjustType,
        quantity: Number(adjustQty),
        reason: adjustReason || undefined,
      });
      if (res.error) {
        setModalError(res.error);
      } else {
        setModalSuccess(`Stock ${adjustType === "INCREASE" ? "increased" : adjustType === "DECREASE" ? "decreased" : "set"} successfully!`);
        setTimeout(() => { setIsModalOpen(false); fetchInventory(); }, 800);
      }
    } catch (err: any) {
      setModalError(err.message || "Failed to adjust stock.");
    } finally {
      setSaving(false);
    }
  };

  const handleViewHistory = async (item: InventoryRecord) => {
    setHistoryItem(item);
    setHistoryLoading(true);
    setExpandedHistoryId(item.id);
    try {
      const res = await apiClient.get<AdjustmentRecord[]>(`/inventory/${item.id}/adjustments`);
      setAdjustments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAdjustments([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const totalOnHand = inventory.reduce((sum, i) => sum + i.quantityOnHand, 0);
  const totalReserved = inventory.reduce((sum, i) => sum + i.quantityReserved, 0);
  const totalAvailable = inventory.reduce((sum, i) => sum + i.availableQuantity, 0);
  const outOfStockCount = inventory.filter((i) => getStockStatus(i) === "OUT_OF_STOCK").length;
  const lowStockCount = inventory.filter((i) => getStockStatus(i) === "LOW_STOCK").length;

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
        <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
          {row.warehouseCode || "HUB"} — {row.warehouseName}
        </span>
      ),
    },
    {
      header: "On Hand",
      render: (row) => (
        <span className="font-bold text-slate-800 dark:text-slate-200">{row.quantityOnHand}</span>
      ),
    },
    {
      header: "Reserved",
      render: (row) => (
        <span className="text-amber-600 dark:text-amber-400 font-semibold">{row.quantityReserved}</span>
      ),
    },
    {
      header: "Available",
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
      header: "Reorder At",
      render: (row) => <span className="text-slate-500 text-xs font-medium">{row.reorderLevel}</span>,
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
    {
      header: "Actions",
      render: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenAdjustModal(row); }}
            className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
          >
            <Edit size={13} />
            <span>Adjust</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (expandedHistoryId === row.id) {
                setExpandedHistoryId(null);
              } else {
                handleViewHistory(row);
              }
            }}
            className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <History size={13} />
            <span>History</span>
            {expandedHistoryId === row.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Admin Inventory Control"
        title="Physical Inventory & Stock Levels"
        description="Monitor physical stock on hand, manage inventory adjustments, and track full adjustment audit history across all warehouses."
        actions={
          <button
            onClick={handleOpenNewStockModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Initialize Stock</span>
          </button>
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "SKUs Tracked", value: inventory.length, color: "blue", icon: <Layers size={20} /> },
          { label: "On Hand", value: totalOnHand, color: "indigo", icon: <Box size={20} /> },
          { label: "Reserved", value: totalReserved, color: "amber", icon: <AlertTriangle size={20} /> },
          { label: "Available", value: totalAvailable, color: "emerald", icon: <CheckCircle2 size={20} /> },
          { label: "Low / Out of Stock", value: `${lowStockCount} / ${outOfStockCount}`, color: "red", icon: <AlertTriangle size={20} /> },
        ].map((m) => (
          <div key={m.label} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{m.label}</div>
              <div className={`text-2xl font-extrabold mt-0.5 text-${m.color}-600 dark:text-${m.color}-400`}>{m.value}</div>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-${m.color}-500/10 text-${m.color}-500 flex items-center justify-center`}>{m.icon}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={selectedWarehouseId}
          onChange={(e) => setSelectedWarehouseId(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.code || "HUB"})</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-indigo-500"
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

      {error && (
        <div className="p-4 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading inventory records...
        </div>
      ) : (
        <div className="space-y-2">
          {filteredInventory.map((row) => (
            <div key={row.id}>
              {/* Inline adjustment history panel */}
              {expandedHistoryId === row.id && (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mt-1 mb-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                    <History size={13} />
                    <span>Adjustment History — {row.productName} @ {row.warehouseCode}</span>
                  </h4>
                  {historyLoading ? (
                    <div className="text-xs text-slate-500 flex items-center space-x-2"><Loader2 size={12} className="animate-spin" /><span>Loading...</span></div>
                  ) : adjustments.length === 0 ? (
                    <div className="text-xs text-slate-500">No adjustment history recorded yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {adjustments.map((adj) => (
                        <div key={adj.id} className="flex items-start justify-between text-xs bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                          <div className="flex items-center space-x-2">
                            {adj.type === "INCREASE" ? <TrendingUp size={13} className="text-emerald-500" /> : adj.type === "DECREASE" ? <TrendingDown size={13} className="text-red-500" /> : <Settings2 size={13} className="text-blue-500" />}
                            <div>
                              <span className={`font-bold ${adj.type === "INCREASE" ? "text-emerald-600" : adj.type === "DECREASE" ? "text-red-600" : "text-blue-600"}`}>{adj.type}</span>
                              <span className="text-slate-500 ml-1.5">×{adj.quantity}</span>
                              <span className="text-slate-400 ml-2">({adj.previousQuantity} <ArrowRight size={10} className="inline" /> {adj.newQuantity})</span>
                            </div>
                          </div>
                          <div className="text-right text-slate-400">
                            <div className="font-medium text-slate-600 dark:text-slate-300">{adj.adjustedBy}</div>
                            {adj.reason && <div className="text-slate-500 italic">{adj.reason}</div>}
                            <div>{new Date(adj.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <DataTable columns={columns} data={filteredInventory} />
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Box size={18} className="text-indigo-500" />
              {isNewStock ? "Initialize / Set Stock Level" : `Adjust Stock — ${selectedItem?.productName}`}
            </h3>
            {isNewStock ? (
              <form onSubmit={handleSaveNewStock} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Warehouse</label>
                  <select value={formWarehouseId} onChange={(e) => setFormWarehouseId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code || "HUB"})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Product</label>
                  <select value={formProductId} onChange={(e) => setFormProductId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500">
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Initial Qty</label>
                    <input type="number" min="0" required value={formQuantityOnHand} onChange={(e) => setFormQuantityOnHand(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reorder At</label>
                    <input type="number" min="0" value={formReorderLevel} onChange={(e) => setFormReorderLevel(parseInt(e.target.value) || 10)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                {modalError && <div className="text-xs text-red-500 p-2 bg-red-50 rounded-lg">{modalError}</div>}
                {modalSuccess && <div className="text-xs text-emerald-600 p-2 bg-emerald-50 rounded-lg">{modalSuccess}</div>}
                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl">Cancel</button>
                  <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center space-x-2">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>Initialize Stock</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdjustStock} className="space-y-4">
                {selectedItem && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    <div>Warehouse: <strong>{selectedItem.warehouseName}</strong></div>
                    <div>On Hand: <strong>{selectedItem.quantityOnHand}</strong> | Reserved: <strong className="text-amber-500">{selectedItem.quantityReserved}</strong> | Available: <strong className="text-emerald-600">{selectedItem.availableQuantity}</strong></div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Adjustment Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["INCREASE", "DECREASE", "SET"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setAdjustType(t)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${adjustType === t ? (t === "INCREASE" ? "bg-emerald-600 text-white border-emerald-600" : t === "DECREASE" ? "bg-red-600 text-white border-red-600" : "bg-blue-600 text-white border-blue-600") : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"}`}>
                        {t === "INCREASE" ? "↑ Increase" : t === "DECREASE" ? "↓ Decrease" : "= Set"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    {adjustType === "SET" ? "Set Quantity To" : "Quantity"}
                  </label>
                  <input type="number" min="0" required value={adjustQty} onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold" />
                  {selectedItem && adjustType !== "SET" && (
                    <div className="text-xs text-slate-500 mt-1">
                      New on-hand will be: <strong>{adjustType === "INCREASE" ? selectedItem.quantityOnHand + adjustQty : Math.max(0, selectedItem.quantityOnHand - adjustQty)}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Reason (Required for audit trail)</label>
                  <input type="text" placeholder="e.g. New shipment received, Damaged units removed..." value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                </div>

                {modalError && <div className="text-xs text-red-500 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">{modalError}</div>}
                {modalSuccess && <div className="text-xs text-emerald-600 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">{modalSuccess}</div>}

                <div className="flex justify-end space-x-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl">Cancel</button>
                  <button type="submit" disabled={saving} className={`px-5 py-2 ${adjustType === "INCREASE" ? "bg-emerald-600 hover:bg-emerald-500" : adjustType === "DECREASE" ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"} disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center space-x-2`}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>Confirm {adjustType}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
