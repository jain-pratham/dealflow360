"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  Package,
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
  Layers,
  Wrench,
  Repeat,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

export type ProductType = "HARDWARE" | "SERVICES" | "SUBSCRIPTIONS";

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category: ProductType;
  basePrice: number;
  costPrice?: number;
  taxRate: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export default function ProductManagementView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formValues, setFormValues] = useState<{
    name: string;
    sku: string;
    description: string;
    category: ProductType;
    basePrice: string;
    costPrice: string;
    taxRate: string;
    currency: string;
    isActive: boolean;
  }>({
    name: "",
    sku: "",
    description: "",
    category: "HARDWARE",
    basePrice: "",
    costPrice: "",
    taxRate: "0",
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
      sku: "",
      description: "",
      category: "HARDWARE",
      basePrice: "",
      costPrice: "",
      taxRate: "0",
      currency: "INR",
      isActive: true,
    });
    setFormErrors({});
    setEditingProduct(null);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const params: any = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (categoryFilter !== "ALL") params.category = categoryFilter;
    if (statusFilter !== "ALL") params.isActive = statusFilter === "ACTIVE";

    const res = await apiClient.get<{ data: Product[] }>("/products", params);
    if (res.data && Array.isArray((res.data as any).data)) {
      setProducts((res.data as any).data);
    } else if (Array.isArray(res.data)) {
      setProducts(res.data as any);
    } else {
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, categoryFilter, statusFilter]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formValues.name.trim()) {
      errors.name = "Product name is required.";
    }
    if (!formValues.sku.trim()) {
      errors.sku = "SKU is required.";
    }
    if (!formValues.category) {
      errors.category = "Product category is required.";
    }
    if (!formValues.basePrice || isNaN(Number(formValues.basePrice)) || Number(formValues.basePrice) < 0) {
      errors.basePrice = "Please enter a valid base price (>= 0).";
    }
    if (formValues.costPrice && (isNaN(Number(formValues.costPrice)) || Number(formValues.costPrice) < 0)) {
      errors.costPrice = "Cost price must be a non-negative number.";
    }
    if (formValues.taxRate && (isNaN(Number(formValues.taxRate)) || Number(formValues.taxRate) < 0)) {
      errors.taxRate = "Tax rate must be a non-negative number.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditClick = (prod: Product) => {
    setEditingProduct(prod);
    setFormValues({
      name: prod.name,
      sku: prod.sku,
      description: prod.description || "",
      category: prod.category || "HARDWARE",
      basePrice: prod.basePrice.toString(),
      costPrice: prod.costPrice ? prod.costPrice.toString() : "",
      taxRate: prod.taxRate ? prod.taxRate.toString() : "0",
      currency: prod.currency || "INR",
      isActive: prod.isActive,
    });
    setFormErrors({});
    setViewMode("edit");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      setTimeout(() => {
        const errorEl = (e.target as HTMLElement).querySelector(".border-red-500, .text-red-500, p.text-rose-500, input.border-rose-500");
        if (errorEl) {
          errorEl.scrollIntoView({ behavior: "smooth", block: "center" });
          if (errorEl instanceof HTMLInputElement || errorEl instanceof HTMLSelectElement) {
            errorEl.focus({ preventScroll: true });
          }
        }
      }, 50);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: formValues.name.trim(),
      sku: formValues.sku.trim(),
      description: formValues.description.trim() || undefined,
      category: formValues.category,
      basePrice: Number(formValues.basePrice),
      costPrice: formValues.costPrice ? Number(formValues.costPrice) : undefined,
      taxRate: formValues.taxRate ? Number(formValues.taxRate) : 0,
      currency: formValues.currency,
      isActive: formValues.isActive,
    };

    if (viewMode === "edit" && editingProduct) {
      // UPDATE PRODUCT
      const res = await apiClient.patch<Product>(`/products/${editingProduct.id}`, payload);
      if (res.data) {
        showToast("success", `Product '${payload.name}' updated successfully.`);
        setViewMode("list");
        resetForm();
        fetchProducts();
      } else {
        showToast("error", res.error || "Failed to update product.");
      }
    } else {
      // CREATE PRODUCT
      const res = await apiClient.post<Product>("/products", payload);
      if (res.data) {
        showToast("success", `Product '${payload.name}' created successfully.`);
        setViewMode("list");
        resetForm();
        fetchProducts();
      } else {
        showToast("error", res.error || "Failed to create product.");
      }
    }

    setIsSubmitting(false);
  };

  const handleToggleStatus = async (prod: Product) => {
    const newStatus = !prod.isActive;
    const res = await apiClient.patch<Product>(`/products/${prod.id}/status`, {
      isActive: newStatus,
    });
    if (res.data) {
      showToast("success", `Product '${prod.name}' status updated to ${newStatus ? "ACTIVE" : "INACTIVE"}.`);
      fetchProducts();
    } else {
      showToast("error", res.error || "Failed to change product status.");
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!confirm(`Are you sure you want to delete '${prod.name}'?`)) return;

    const res = await apiClient.delete<{ message: string }>(`/products/${prod.id}`);
    if (res.data) {
      showToast("success", `Product '${prod.name}' deleted successfully.`);
      fetchProducts();
    } else {
      showToast("error", res.error || "Cannot delete product. Try deactivating it instead.");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
  };

  // Stat Counters
  const totalCount = products.length;
  const activeCount = products.filter((p) => p.isActive).length;
  const inactiveCount = products.filter((p) => !p.isActive).length;
  const hardwareCount = products.filter((p) => p.category === "HARDWARE").length;
  const servicesCount = products.filter((p) => p.category === "SERVICES" || (p.category as any) === "SERVICE").length;
  const subscriptionsCount = products.filter((p) => p.category === "SUBSCRIPTIONS" || (p.category as any) === "SUBSCRIPTION").length;

  const renderCategoryBadge = (cat: string) => {
    const normalized = cat.toUpperCase();
    if (normalized.includes("HARDWARE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Layers className="w-3 h-3" />
          HARDWARE
        </span>
      );
    }
    if (normalized.includes("SERVICE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <Wrench className="w-3 h-3" />
          SERVICES
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <Repeat className="w-3 h-3" />
        SUBSCRIPTIONS
      </span>
    );
  };

  const formatPrice = (val: number, currency: string) => {
    const symbolMap: Record<string, string> = { INR: "₹", USD: "$", EUR: "€" };
    const sym = symbolMap[currency] || currency;
    return `${sym}${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  const columns: Column<Product>[] = [
    {
      header: "Product",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0D69B2]/10 text-[#0D69B2] dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">{row.name}</div>
            <div className="text-[11px] text-slate-400 font-mono font-semibold">SKU: {row.sku}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      render: (row) => renderCategoryBadge(row.category),
    },
    {
      header: "Base Price",
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm">
          {formatPrice(row.basePrice, row.currency)}
        </span>
      ),
    },
    {
      header: "Tax Rate",
      render: (row) => <span className="text-xs text-slate-600 dark:text-slate-400">{row.taxRate}%</span>,
    },
    {
      header: "Currency",
      render: (row) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{row.currency}</span>,
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
            onClick={() => handleEditClick(row)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg text-[#0D69B2] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
              row.isActive
                ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
            title={row.isActive ? "Deactivate Product" : "Reactivate Product"}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteProduct(row)}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete Product"
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
        /* PRODUCT LIST PAGE VIEW */
        <div>
          <PageHeader
            badgeText="Product Catalog"
            title="Product & Service Catalog"
            description="Manage enterprise hardware SKUs, professional services, software subscriptions, base prices, and tax rates."
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
                <span>Add Product</span>
              </button>
            }
          />

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-slate-500 font-medium">Total Products</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{totalCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-emerald-600 font-medium">Active</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{activeCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-rose-600 font-medium">Inactive</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{inactiveCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-blue-600 font-medium">Hardware</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{hardwareCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-purple-600 font-medium">Services</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{servicesCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-emerald-600 font-medium">Subscriptions</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{subscriptionsCount}</div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or SKU..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="HARDWARE">Hardware</option>
                  <option value="SERVICES">Services</option>
                  <option value="SUBSCRIPTIONS">Subscriptions</option>
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

              {(searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL") && (
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

          {/* Table Container */}
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <Loader2 className="w-7 h-7 animate-spin text-[#0D69B2] mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">Loading catalog items...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0D69B2] flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No products found</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">Create your first product SKU to get started.</p>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setViewMode("create");
                  }}
                  className="bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={products}
                onRowClick={(row) => handleEditClick(row)}
              />
            )}
          </div>
        </div>
      ) : (
        /* INLINE ADD / EDIT PRODUCT FORM */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PageHeader
            badgeText={viewMode === "edit" ? "Product Management" : "Product Registration"}
            title={viewMode === "edit" ? "Edit Product Details" : "Add New Product"}
            description={
              viewMode === "edit"
                ? `Update SKU, category, base price, and tax parameters for ${editingProduct?.name || "product"}.`
                : "Register a new catalog SKU, assign product category, base price, and tax parameters."
            }
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
                <span>Back to Products</span>
              </button>
            }
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8">
            <form noValidate onSubmit={handleFormSubmit} className="space-y-8 max-w-4xl mx-auto">
              {/* SECTION 1: PRODUCT INFORMATION */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-7 h-7 rounded-full bg-[#0D69B2] text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
                    1
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Product Identification & Category
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.name}
                      onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                      placeholder="e.g. Enterprise Server X100"
                      className={`w-full px-4 py-3 rounded-xl border ${
                        formErrors.name ? "border-rose-500 bg-rose-50/50" : "border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800"
                      } text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]`}
                    />
                    {formErrors.name && <p className="text-xs text-rose-500 mt-1.5 font-medium">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      SKU Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.sku}
                      onChange={(e) => setFormValues({ ...formValues, sku: e.target.value })}
                      placeholder="e.g. SKU-HW-SERVER-01"
                      className={`w-full px-4 py-3 rounded-xl border ${
                        formErrors.sku ? "border-rose-500 bg-rose-50/50" : "border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800"
                      } text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]`}
                    />
                    {formErrors.sku && <p className="text-xs text-rose-500 mt-1.5 font-medium">{formErrors.sku}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formValues.description}
                    onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                    placeholder="Enter detailed technical description or scope of service..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                  />
                </div>
              </div>

              {/* SECTION 2: CATEGORY & PRICING */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0D69B2] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950 text-[#0D69B2] inline-flex items-center justify-center text-xs">
                      2
                    </span>
                    <span>Category & Base Pricing</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Product Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formValues.category}
                      onChange={(e) => setFormValues({ ...formValues, category: e.target.value as ProductType })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                    >
                      <option value="HARDWARE">Hardware</option>
                      <option value="SERVICES">Services</option>
                      <option value="SUBSCRIPTIONS">Subscriptions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Base Price <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formValues.basePrice}
                      onChange={(e) => setFormValues({ ...formValues, basePrice: e.target.value })}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 rounded-xl border ${
                        formErrors.basePrice ? "border-rose-500 bg-rose-50/50" : "border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800"
                      } text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]`}
                    />
                    {formErrors.basePrice && <p className="text-xs text-rose-500 mt-1.5 font-medium">{formErrors.basePrice}</p>}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formValues.taxRate}
                      onChange={(e) => setFormValues({ ...formValues, taxRate: e.target.value })}
                      placeholder="e.g. 18"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                    />
                  </div>

                  <div className="pt-2 sm:pt-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">Catalog Status</span>
                      <span className="text-[11px] text-slate-500">
                        {formValues.isActive ? "Available for quotations and price lists" : "Deactivated from new quotes"}
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
                </div>
              </div>

              {/* BOTTOM ACTIONS */}
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
                      <span>{viewMode === "edit" ? "Saving..." : "Creating Product..."}</span>
                    </>
                  ) : (
                    <>
                      {viewMode === "edit" ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{viewMode === "edit" ? "Save Changes" : "Create Product"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
