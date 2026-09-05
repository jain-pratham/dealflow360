"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  CircleDollarSign,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  RotateCcw,
  X,
  ArrowLeft,
  Loader2,
  Edit2,
  Save,
  Trash2,
  Power,
  Award,
  Package,
  Layers,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Product } from "@/components/products/ProductManagementView";

export type CustomerTier = "BRONZE" | "SILVER" | "GOLD";

export interface PriceListItem {
  id: string;
  priceListId: string;
  productId: string;
  price: number;
  createdAt: string;
  updatedAt?: string;
  product?: Product;
}

export interface PriceList {
  id: string;
  name: string;
  description?: string;
  customerTier: CustomerTier;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  itemsCount: number;
  items?: PriceListItem[];
}

export default function PriceListManagementView() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "create" | "details">("list");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [editingPriceList, setEditingPriceList] = useState<PriceList | null>(null);

  // Add Item State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [itemPrice, setItemPrice] = useState<string>("");
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<PriceListItem | null>(null);
  const [editItemPrice, setEditItemPrice] = useState<string>("");

  // Form State
  const [formValues, setFormValues] = useState<{
    name: string;
    description: string;
    customerTier: CustomerTier;
    currency: string;
    isActive: boolean;
  }>({
    name: "",
    description: "",
    customerTier: "BRONZE",
    currency: "INR",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const resetForm = () => {
    setFormValues({
      name: "",
      description: "",
      customerTier: "BRONZE",
      currency: "INR",
      isActive: true,
    });
    setFormErrors({});
    setEditingPriceList(null);
  };

  const fetchPriceLists = async () => {
    setLoading(true);
    const params: any = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (tierFilter !== "ALL") params.customerTier = tierFilter;
    if (currencyFilter !== "ALL") params.currency = currencyFilter;
    if (statusFilter !== "ALL") params.isActive = statusFilter === "ACTIVE";

    const res = await apiClient.get<{ data: PriceList[] }>("/price-lists", params);
    if (res.data && Array.isArray((res.data as any).data)) {
      setPriceLists((res.data as any).data);
    } else if (Array.isArray(res.data)) {
      setPriceLists(res.data as any);
    } else {
      setPriceLists([]);
    }
    setLoading(false);
  };

  const fetchActiveProducts = async () => {
    const res = await apiClient.get<{ data: Product[] }>("/products", { isActive: true, limit: 100 });
    if (res.data && Array.isArray((res.data as any).data)) {
      setActiveProducts((res.data as any).data);
    } else if (Array.isArray(res.data)) {
      setActiveProducts(res.data as any);
    }
  };

  useEffect(() => {
    fetchPriceLists();
    fetchActiveProducts();
  }, [searchQuery, tierFilter, currencyFilter, statusFilter]);

  const loadPriceListDetails = async (id: string) => {
    const res = await apiClient.get<PriceList>(`/price-lists/${id}`);
    if (res.data) {
      setSelectedPriceList(res.data);
      setViewMode("details");
    } else {
      showToast("error", res.error || "Failed to load price list details.");
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formValues.name.trim()) {
      errors.name = "Price list name is required.";
    }
    if (!formValues.customerTier) {
      errors.customerTier = "Customer tier is required.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePriceList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const payload = {
      name: formValues.name.trim(),
      description: formValues.description.trim() || undefined,
      customerTier: formValues.customerTier,
      currency: formValues.currency,
      isActive: formValues.isActive,
    };

    if (editingPriceList) {
      // UPDATE
      const res = await apiClient.patch<PriceList>(`/price-lists/${editingPriceList.id}`, payload);
      if (res.data) {
        showToast("success", `Price list '${payload.name}' updated successfully.`);
        setViewMode("list");
        resetForm();
        fetchPriceLists();
      } else {
        showToast("error", res.error || "Failed to update price list.");
      }
    } else {
      // CREATE
      const res = await apiClient.post<PriceList>("/price-lists", payload);
      if (res.data) {
        showToast("success", `Price list '${payload.name}' created successfully.`);
        setSelectedPriceList(res.data);
        setViewMode("details");
        resetForm();
        fetchPriceLists();
      } else {
        showToast("error", res.error || "Failed to create price list.");
      }
    }

    setIsSubmitting(false);
  };

  const handleToggleStatus = async (pl: PriceList) => {
    const newStatus = !pl.isActive;
    const res = await apiClient.patch<PriceList>(`/price-lists/${pl.id}/status`, {
      isActive: newStatus,
    });
    if (res.data) {
      showToast("success", `Price list '${pl.name}' status updated to ${newStatus ? "ACTIVE" : "INACTIVE"}.`);
      fetchPriceLists();
    } else {
      showToast("error", res.error || "Failed to change price list status.");
    }
  };

  const handleDeletePriceList = async (pl: PriceList) => {
    if (!confirm(`Are you sure you want to delete '${pl.name}'?`)) return;

    const res = await apiClient.delete<{ message: string }>(`/price-lists/${pl.id}`);
    if (res.data) {
      showToast("success", `Price list '${pl.name}' deleted successfully.`);
      if (selectedPriceList?.id === pl.id) {
        setViewMode("list");
        setSelectedPriceList(null);
      }
      fetchPriceLists();
    } else {
      showToast("error", res.error || "Failed to delete price list.");
    }
  };

  // Add Item to Price List
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPriceList) return;
    if (!selectedProductId) {
      showToast("error", "Please select a product.");
      return;
    }
    if (!itemPrice || isNaN(Number(itemPrice)) || Number(itemPrice) < 0) {
      showToast("error", "Please enter a valid price (>= 0).");
      return;
    }

    setIsAddingItem(true);
    const res = await apiClient.post<PriceListItem>(`/price-lists/${selectedPriceList.id}/items`, {
      productId: selectedProductId,
      price: Number(itemPrice),
    });

    if (res.data) {
      showToast("success", "Product added to price list successfully.");
      setSelectedProductId("");
      setItemPrice("");
      loadPriceListDetails(selectedPriceList.id);
      fetchPriceLists();
    } else {
      showToast("error", res.error || "Failed to add product to price list.");
    }
    setIsAddingItem(false);
  };

  // Update Item Price
  const handleUpdateItemPrice = async () => {
    if (!selectedPriceList || !editingItem) return;
    if (!editItemPrice || isNaN(Number(editItemPrice)) || Number(editItemPrice) < 0) {
      showToast("error", "Please enter a valid price (>= 0).");
      return;
    }

    const res = await apiClient.patch<PriceListItem>(
      `/price-lists/${selectedPriceList.id}/items/${editingItem.id}`,
      { price: Number(editItemPrice) }
    );

    if (res.data) {
      showToast("success", "Item price updated successfully.");
      setEditingItem(null);
      setEditItemPrice("");
      loadPriceListDetails(selectedPriceList.id);
    } else {
      showToast("error", res.error || "Failed to update item price.");
    }
  };

  // Remove Item from Price List
  const handleRemoveItem = async (item: PriceListItem) => {
    if (!selectedPriceList) return;
    if (!confirm("Are you sure you want to remove this product from the price list?")) return;

    const res = await apiClient.delete<{ message: string }>(
      `/price-lists/${selectedPriceList.id}/items/${item.id}`
    );

    if (res.data) {
      showToast("success", "Product removed from price list.");
      loadPriceListDetails(selectedPriceList.id);
      fetchPriceLists();
    } else {
      showToast("error", res.error || "Failed to remove item.");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTierFilter("ALL");
    setCurrencyFilter("ALL");
    setStatusFilter("ALL");
  };

  // Stat Counters
  const totalCount = priceLists.length;
  const activeCount = priceLists.filter((pl) => pl.isActive).length;
  const bronzeCount = priceLists.filter((pl) => pl.customerTier === "BRONZE").length;
  const silverCount = priceLists.filter((pl) => pl.customerTier === "SILVER").length;
  const goldCount = priceLists.filter((pl) => pl.customerTier === "GOLD").length;

  const renderTierBadge = (tier: CustomerTier) => {
    const badgeStyles = {
      GOLD: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/30",
      SILVER: "bg-slate-500/10 text-slate-600 dark:bg-slate-400/20 dark:text-slate-300 border-slate-400/30",
      BRONZE: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/30",
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyles[tier]}`}>
        <Award className="w-3 h-3" />
        {tier} TIER
      </span>
    );
  };

  const formatPrice = (val: number, currency: string) => {
    const symbolMap: Record<string, string> = { INR: "₹", USD: "$", EUR: "€" };
    const sym = symbolMap[currency] || currency;
    return `${sym}${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  const columns: Column<PriceList>[] = [
    {
      header: "Price List Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
            <CircleDollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">{row.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">{row.description || "No description"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Customer Tier",
      render: (row) => renderTierBadge(row.customerTier),
    },
    {
      header: "Currency",
      render: (row) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{row.currency}</span>,
    },
    {
      header: "Products Count",
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs font-mono">
          <Package className="w-3.5 h-3.5 text-slate-400" />
          {row.itemsCount} SKUs
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={row.isActive ? "success" : "danger"}
          label={row.isActive ? "ACTIVE" : "INACTIVE"}
        />
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => loadPriceListDetails(row.id)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg text-[#0D69B2] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
          >
            Manage Items
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingPriceList(row);
              setFormValues({
                name: row.name,
                description: row.description || "",
                customerTier: row.customerTier,
                currency: row.currency,
                isActive: row.isActive,
              });
              setViewMode("create");
            }}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Edit Price List Header"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            className={`p-1.5 rounded-lg transition-colors ${
              row.isActive
                ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
            title={row.isActive ? "Deactivate Price List" : "Reactivate Price List"}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeletePriceList(row)}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete Price List"
          >
            <Trash2 className="w-3.5 h-3.5" />
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
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
            toastMessage.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-700"
              : "bg-rose-900 text-rose-100 border-rose-700"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {viewMode === "list" ? (
        /* PRICE LISTS TABLE PAGE */
        <div>
          <PageHeader
            badgeText="Pricing Strategy"
            title="Price Lists & Tier Pricing"
            description="Configure customer tier pricing overrides (Bronze, Silver, Gold), catalog discounts, and currency-specific pricing matrices."
            actions={
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setViewMode("create");
                }}
                className="bg-[#0D69B2] hover:bg-[#0b5a99] active:scale-[0.99] transition-all text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Price List</span>
              </button>
            }
          />

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-slate-500 font-medium">Total Price Lists</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{totalCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-emerald-600 font-medium">Active Lists</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{activeCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-orange-600 font-medium">Bronze Tier</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{bronzeCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-slate-600 font-medium">Silver Tier</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{silverCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-amber-600 font-medium">Gold Tier</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{goldCount}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search price lists..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Tiers</option>
                  <option value="BRONZE">Bronze Tier</option>
                  <option value="SILVER">Silver Tier</option>
                  <option value="GOLD">Gold Tier</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Currencies</option>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {(searchQuery || tierFilter !== "ALL" || currencyFilter !== "ALL" || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <Loader2 className="w-7 h-7 animate-spin text-[#0D69B2] mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">Loading price lists...</p>
              </div>
            ) : priceLists.length === 0 ? (
              <div className="py-12 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <CircleDollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No price lists found</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">Create a customer tier price list to configure override pricing.</p>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setViewMode("create");
                  }}
                  className="bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Price List</span>
                </button>
              </div>
            ) : (
              <DataTable columns={columns} data={priceLists} onRowClick={(row) => loadPriceListDetails(row.id)} />
            )}
          </div>
        </div>
      ) : viewMode === "create" ? (
        /* CREATE / EDIT PRICE LIST HEADER FORM */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PageHeader
            badgeText={editingPriceList ? "Price List Management" : "Pricing Configuration"}
            title={editingPriceList ? "Edit Price List Header" : "Create New Price List"}
            description="Configure price list target tier, currency, and general metadata."
            actions={
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  resetForm();
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Price Lists</span>
              </button>
            }
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 max-w-3xl mx-auto">
            <form onSubmit={handleCreatePriceList} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Price List Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  placeholder="e.g. Gold Tier India Pricing Matrix"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    formErrors.name ? "border-rose-500 bg-rose-50/50" : "border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800"
                  } text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]`}
                />
                {formErrors.name && <p className="text-xs text-rose-500 mt-1.5 font-medium">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formValues.description}
                  onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                  placeholder="Notes or scope for this price list..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Customer Tier <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formValues.customerTier}
                    onChange={(e) => setFormValues({ ...formValues, customerTier: e.target.value as CustomerTier })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                  >
                    <option value="BRONZE">Bronze Tier</option>
                    <option value="SILVER">Silver Tier</option>
                    <option value="GOLD">Gold Tier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={formValues.currency}
                    onChange={(e) => setFormValues({ ...formValues, currency: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">Active Status</span>
                  <span className="text-[11px] text-slate-500">
                    {formValues.isActive ? "Active for quotation price lookups" : "Disabled from quote engine"}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formValues.isActive}
                    onChange={(e) => setFormValues({ ...formValues, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#0D69B2]"></div>
                  <span className="ml-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {formValues.isActive ? "Active" : "Inactive"}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("list");
                    resetForm();
                  }}
                  className="px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-[#0D69B2] hover:bg-[#0b5a99] text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{editingPriceList ? "Saving..." : "Creating List..."}</span>
                    </>
                  ) : (
                    <>
                      {editingPriceList ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{editingPriceList ? "Save Changes" : "Create & Manage Items"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* PRICE LIST DETAILS & ITEMS MANAGER */
        selectedPriceList && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <PageHeader
              badgeText="Price List Items Manager"
              title={selectedPriceList.name}
              description={`Tier: ${selectedPriceList.customerTier} | Currency: ${selectedPriceList.currency} | Status: ${
                selectedPriceList.isActive ? "ACTIVE" : "INACTIVE"
              }`}
              actions={
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("list");
                    setSelectedPriceList(null);
                  }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Price Lists</span>
                </button>
              }
            />

            {/* ADD PRODUCT ITEM FORM */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 sm:p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0D69B2] mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Add Active Product to Price List</span>
              </h4>
              <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Active Product
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                  >
                    <option value="">-- Choose active product --</option>
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Base: {formatPrice(p.basePrice, p.currency)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price List Override Price ({selectedPriceList.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="Enter tier price"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isAddingItem}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0D69B2] hover:bg-[#0b5a99] text-white text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-70"
                  >
                    {isAddingItem ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add Item</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* PRICE LIST ITEMS TABLE */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#0D69B2]" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Products in this Price List ({selectedPriceList.items?.length || 0})
                  </h3>
                </div>
              </div>

              {!selectedPriceList.items || selectedPriceList.items.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No products added yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Select an active product above to add it to this price list.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Product SKU & Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Base Price</th>
                        <th className="px-4 py-3">Tier Override Price</th>
                        <th className="px-4 py-3">Difference</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {selectedPriceList.items.map((item) => {
                        const basePrice = item.product?.basePrice ?? 0;
                        const diff = item.price - basePrice;
                        const diffPercent = basePrice > 0 ? (diff / basePrice) * 100 : 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {item.product?.name || "Unknown Product"}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                SKU: {item.product?.sku || "N/A"}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {item.product?.category || "HARDWARE"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-mono">
                              {formatPrice(basePrice, selectedPriceList.currency)}
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                              {formatPrice(item.price, selectedPriceList.currency)}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs">
                              {diff < 0 ? (
                                <span className="text-emerald-600 font-semibold">
                                  -{Math.abs(diffPercent).toFixed(1)}% ({formatPrice(diff, selectedPriceList.currency)})
                                </span>
                              ) : diff > 0 ? (
                                <span className="text-amber-600 font-semibold">
                                  +{diffPercent.toFixed(1)}% (+{formatPrice(diff, selectedPriceList.currency)})
                                </span>
                              ) : (
                                <span className="text-slate-400">Standard</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setEditItemPrice(item.price.toString());
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold text-[#0D69B2] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                                >
                                  Edit Price
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item)}
                                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  title="Remove from price list"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* EDIT ITEM PRICE MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Edit Price List Override
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-400 block">Product</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {editingItem.product?.name} ({editingItem.product?.sku})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Override Price ({selectedPriceList?.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editItemPrice}
                  onChange={(e) => setEditItemPrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateItemPrice}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#0D69B2] hover:bg-[#0b5a99] text-white shadow-sm"
              >
                Save Price
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
