"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  Plus,
  Search,
  Filter,
  RotateCcw,
  X,
  Loader2,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

export interface Product {
  id: string;
  name: string;
  sku: string;
  basePrice: number;
  currency: string;
  isActive: boolean;
}

export interface RecommendationPairing {
  id: string;
  primaryProductId: string;
  suggestedProductId: string;
  type: "UPSELL" | "CROSS_SELL";
  priority: number;
  coPurchaseScore: number;
  isActive: boolean;
  createdAt: string;
  primaryProduct?: Product;
  suggestedProduct?: Product;
}

export default function AdminUpsellRulesPage() {
  const [pairings, setPairings] = useState<RecommendationPairing[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPairing, setEditingPairing] = useState<RecommendationPairing | null>(null);

  // Form State
  const [primaryProductId, setPrimaryProductId] = useState<string>("");
  const [suggestedProductId, setSuggestedProductId] = useState<string>("");
  const [type, setType] = useState<"UPSELL" | "CROSS_SELL">("UPSELL");
  const [priority, setPriority] = useState<number>(1);
  const [coPurchaseScore, setCoPurchaseScore] = useState<number>(1.0);
  const [isActive, setIsActive] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (toastType: "success" | "error", text: string) => {
    setToastMessage({ type: toastType, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchPairings = async () => {
    setLoading(true);
    const params: any = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (typeFilter !== "ALL") params.type = typeFilter;
    if (statusFilter !== "ALL") params.isActive = statusFilter === "ACTIVE";

    const res = await apiClient.get<RecommendationPairing[]>("/recommendations", params);
    if (res.data && Array.isArray(res.data)) {
      setPairings(res.data);
    } else {
      setPairings([]);
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    const res = await apiClient.get<{ data: Product[] }>("/products", { isActive: true, limit: 100 });
    if (res.data && Array.isArray((res.data as any).data)) {
      setProducts((res.data as any).data);
    } else if (Array.isArray(res.data)) {
      setProducts(res.data as any);
    }
  };

  useEffect(() => {
    fetchPairings();
    fetchProducts();
  }, [searchQuery, typeFilter, statusFilter]);

  const resetForm = () => {
    setEditingPairing(null);
    setPrimaryProductId("");
    setSuggestedProductId("");
    setType("UPSELL");
    setPriority(1);
    setCoPurchaseScore(1.0);
    setIsActive(true);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pairing: RecommendationPairing) => {
    setEditingPairing(pairing);
    setPrimaryProductId(pairing.primaryProductId);
    setSuggestedProductId(pairing.suggestedProductId);
    setType(pairing.type);
    setPriority(pairing.priority || 1);
    setCoPurchaseScore(pairing.coPurchaseScore || 1.0);
    setIsActive(pairing.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryProductId) {
      showToast("error", "Please select a source product.");
      return;
    }
    if (!suggestedProductId) {
      showToast("error", "Please select a recommended product.");
      return;
    }
    if (primaryProductId === suggestedProductId) {
      showToast("error", "Source product and recommended product cannot be the same.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      primaryProductId,
      suggestedProductId,
      type,
      priority: Number(priority) || 1,
      coPurchaseScore: Number(coPurchaseScore) || 1.0,
      isActive,
    };

    if (editingPairing) {
      const res = await apiClient.patch<RecommendationPairing>(`/recommendations/${editingPairing.id}`, payload);
      if (res.data) {
        showToast("success", "Recommendation pairing updated successfully!");
        setIsModalOpen(false);
        resetForm();
        fetchPairings();
      } else {
        showToast("error", res.error || "Failed to update recommendation pairing.");
      }
    } else {
      const res = await apiClient.post<RecommendationPairing>("/recommendations", payload);
      if (res.data) {
        showToast("success", "New recommendation pairing created successfully!");
        setIsModalOpen(false);
        resetForm();
        fetchPairings();
      } else {
        showToast("error", res.error || "Failed to create recommendation pairing.");
      }
    }

    setIsSubmitting(false);
  };

  const handleToggleStatus = async (pairing: RecommendationPairing) => {
    const res = await apiClient.patch<RecommendationPairing>(`/recommendations/${pairing.id}/status`);
    if (res.data) {
      showToast("success", `Recommendation pairing ${res.data.isActive ? "activated" : "deactivated"}.`);
      fetchPairings();
    } else {
      showToast("error", res.error || "Failed to toggle status.");
    }
  };

  const handleDelete = async (pairing: RecommendationPairing) => {
    if (!confirm(`Are you sure you want to delete this recommendation pairing? (This will NOT delete the actual products)`)) {
      return;
    }
    const res = await apiClient.delete(`/recommendations/${pairing.id}`);
    if (res.status === 200 || !res.error) {
      showToast("success", "Recommendation pairing removed.");
      fetchPairings();
    } else {
      showToast("error", res.error || "Failed to delete pairing.");
    }
  };

  const formatPrice = (val: number, cur: string = "INR") => {
    const sym = cur === "USD" ? "$" : cur === "EUR" ? "€" : "₹";
    return `${sym}${Number(val || 0).toLocaleString("en-IN")}`;
  };

  const columns: Column<RecommendationPairing>[] = [
    {
      header: "Source Product",
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{row.primaryProduct?.name || "N/A"}</div>
          <div className="text-[11px] font-mono text-slate-400">
            SKU: {row.primaryProduct?.sku} | {formatPrice(row.primaryProduct?.basePrice || 0, row.primaryProduct?.currency)}
          </div>
        </div>
      ),
    },
    {
      header: "Recommended Product",
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{row.suggestedProduct?.name || "N/A"}</div>
          <div className="text-[11px] font-mono text-slate-400">
            SKU: {row.suggestedProduct?.sku} | {formatPrice(row.suggestedProduct?.basePrice || 0, row.suggestedProduct?.currency)}
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
            row.type === "UPSELL"
              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200"
          }`}
        >
          {row.type === "UPSELL" ? <TrendingUp className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
          <span>{row.type}</span>
        </span>
      ),
    },
    {
      header: "Priority / Weight",
      render: (row) => (
        <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
          Priority: <span className="font-bold">{row.priority || 1}</span> | Weight: {row.coPurchaseScore}
        </div>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge type={row.isActive ? "success" : "danger"} label={row.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-colors ${
              row.isActive
                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            {row.isActive ? "Deactivate" : "Activate"}
          </button>

          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 text-slate-500 hover:text-[#0D69B2] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
            title="Edit Pairing"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
            title="Delete Pairing"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
            toastMessage.type === "success"
              ? "bg-slate-900 text-emerald-300 border-emerald-500/30"
              : "bg-slate-900 text-rose-300 border-rose-500/30"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="space-y-6">
        <PageHeader
          badgeText="Product Intelligence"
          title="Upsell & Cross-Sell Rules"
          description="Configure smart product recommendation pairings and priority weights for real-time quotation upsell panel."
          actions={
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="bg-[#0D69B2] hover:bg-[#0b5a99] active:scale-[0.99] transition-all text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Recommendation</span>
            </button>
          }
        />

        {/* Toolbar & Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product or SKU..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="UPSELL">UPSELL</option>
              <option value="CROSS_SELL">CROSS_SELL</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            {(searchQuery || typeFilter !== "ALL" || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-[#0D69B2] mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Loading recommendation pairings...</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={pairings}
            onRowClick={(row) => handleOpenEditModal(row)}
            emptyMessage="No recommendation pairings configured yet."
          />
        )}
      </div>

      {/* CREATE / EDIT MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editingPairing ? "Edit Recommendation Pairing" : "Create Product Pairing"}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure source product and recommended item relationship.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Source Product <span className="text-rose-500">*</span>
                </label>
                <select
                  value={primaryProductId}
                  onChange={(e) => setPrimaryProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                >
                  <option value="">-- Choose source product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Base: {formatPrice(p.basePrice, p.currency)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Recommended Product <span className="text-rose-500">*</span>
                </label>
                <select
                  value={suggestedProductId}
                  onChange={(e) => setSuggestedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                >
                  <option value="">-- Choose recommended product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Base: {formatPrice(p.basePrice, p.currency)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Recommendation Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "UPSELL" | "CROSS_SELL")}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                  >
                    <option value="UPSELL">UPSELL (Higher Value Upgrade)</option>
                    <option value="CROSS_SELL">CROSS-SELL (Complementary Item)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Display Priority Rank
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Recommendation Weight / Score
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={coPurchaseScore}
                  onChange={(e) => setCoPurchaseScore(parseFloat(e.target.value) || 1.0)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#0D69B2] rounded focus:ring-0 cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Active Rule (Display in Quotation Builder)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0D69B2] hover:bg-[#0b5a99] text-white text-xs font-semibold shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{editingPairing ? "Save Changes" : "Create Pairing"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
