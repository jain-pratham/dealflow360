"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  Sliders,
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
  ShieldCheck,
  Percent,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

export type CustomerTier = "BRONZE" | "SILVER" | "GOLD";
export type ProductType = "HARDWARE" | "SERVICES" | "SUBSCRIPTIONS";
export type ApprovalRoleRequired = "SALES_MANAGER" | "FINANCE";

export interface DiscountRule {
  id: string;
  name: string;
  customerTier: CustomerTier;
  productCategory: ProductType;
  maxDiscountPercent: number;
  approvalThresholdPercent: number;
  approvalRoleRequired: ApprovalRoleRequired;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export default function DiscountRulesView() {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list");
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);

  // Form State
  const [formValues, setFormValues] = useState<{
    name: string;
    customerTier: CustomerTier;
    productCategory: ProductType;
    maxDiscountPercent: string;
    approvalThresholdPercent: string;
    approvalRoleRequired: ApprovalRoleRequired;
    isActive: boolean;
  }>({
    name: "",
    customerTier: "BRONZE",
    productCategory: "HARDWARE",
    maxDiscountPercent: "10",
    approvalThresholdPercent: "5",
    approvalRoleRequired: "SALES_MANAGER",
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
      customerTier: "BRONZE",
      productCategory: "HARDWARE",
      maxDiscountPercent: "10",
      approvalThresholdPercent: "5",
      approvalRoleRequired: "SALES_MANAGER",
      isActive: true,
    });
    setFormErrors({});
    setEditingRule(null);
  };

  const fetchRules = async () => {
    setLoading(true);
    const params: any = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (tierFilter !== "ALL") params.customerTier = tierFilter;
    if (categoryFilter !== "ALL") params.productCategory = categoryFilter;
    if (statusFilter !== "ALL") params.isActive = statusFilter === "ACTIVE";

    const res = await apiClient.get<{ data: DiscountRule[] }>("/discount-rules", params);
    if (res.data && Array.isArray((res.data as any).data)) {
      setRules((res.data as any).data);
    } else if (Array.isArray(res.data)) {
      setRules(res.data as any);
    } else {
      setRules([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, [searchQuery, tierFilter, categoryFilter, statusFilter]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formValues.name.trim()) {
      errors.name = "Rule name is required.";
    }
    const maxVal = Number(formValues.maxDiscountPercent);
    const threshVal = Number(formValues.approvalThresholdPercent);

    if (isNaN(maxVal) || maxVal < 0 || maxVal > 100) {
      errors.maxDiscountPercent = "Maximum discount must be between 0% and 100%.";
    }
    if (isNaN(threshVal) || threshVal < 0 || threshVal > 100) {
      errors.approvalThresholdPercent = "Approval threshold must be between 0% and 100%.";
    }
    if (!isNaN(maxVal) && !isNaN(threshVal) && threshVal > maxVal) {
      errors.approvalThresholdPercent = "Approval threshold cannot be greater than maximum allowed discount.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditClick = (rule: DiscountRule) => {
    setEditingRule(rule);
    setFormValues({
      name: rule.name,
      customerTier: rule.customerTier,
      productCategory: rule.productCategory,
      maxDiscountPercent: rule.maxDiscountPercent.toString(),
      approvalThresholdPercent: rule.approvalThresholdPercent.toString(),
      approvalRoleRequired: rule.approvalRoleRequired,
      isActive: rule.isActive,
    });
    setFormErrors({});
    setViewMode("edit");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const payload = {
      name: formValues.name.trim(),
      customerTier: formValues.customerTier,
      productCategory: formValues.productCategory,
      maxDiscountPercent: Number(formValues.maxDiscountPercent),
      approvalThresholdPercent: Number(formValues.approvalThresholdPercent),
      approvalRoleRequired: formValues.approvalRoleRequired,
      isActive: formValues.isActive,
    };

    if (viewMode === "edit" && editingRule) {
      const res = await apiClient.patch<DiscountRule>(`/discount-rules/${editingRule.id}`, payload);
      if (res.data) {
        showToast("success", `Discount rule '${payload.name}' updated successfully.`);
        setViewMode("list");
        resetForm();
        fetchRules();
      } else {
        showToast("error", res.error || "Failed to update discount rule.");
      }
    } else {
      const res = await apiClient.post<DiscountRule>("/discount-rules", payload);
      if (res.data) {
        showToast("success", `Discount rule '${payload.name}' created successfully.`);
        setViewMode("list");
        resetForm();
        fetchRules();
      } else {
        showToast("error", res.error || "Failed to create discount rule.");
      }
    }

    setIsSubmitting(false);
  };

  const handleToggleStatus = async (rule: DiscountRule) => {
    const newStatus = !rule.isActive;
    const res = await apiClient.patch<DiscountRule>(`/discount-rules/${rule.id}/status`, {
      isActive: newStatus,
    });
    if (res.data) {
      showToast("success", `Discount rule status updated to ${newStatus ? "ACTIVE" : "INACTIVE"}.`);
      fetchRules();
    } else {
      showToast("error", res.error || "Failed to change rule status.");
    }
  };

  const handleDeleteRule = async (rule: DiscountRule) => {
    if (!confirm(`Are you sure you want to delete '${rule.name}'?`)) return;

    const res = await apiClient.delete<{ message: string }>(`/discount-rules/${rule.id}`);
    if (res.data) {
      showToast("success", `Discount rule '${rule.name}' deleted successfully.`);
      fetchRules();
    } else {
      showToast("error", res.error || "Failed to delete discount rule.");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTierFilter("ALL");
    setCategoryFilter("ALL");
    setStatusFilter("ALL");
  };

  // Stat Counters
  const totalCount = rules.length;
  const activeCount = rules.filter((r) => r.isActive).length;
  const hardwareCount = rules.filter((r) => r.productCategory === "HARDWARE").length;
  const servicesCount = rules.filter((r) => r.productCategory === "SERVICES").length;
  const subscriptionsCount = rules.filter((r) => r.productCategory === "SUBSCRIPTIONS").length;

  const renderTierBadge = (tier: CustomerTier) => {
    const badgeStyles = {
      GOLD: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/30",
      SILVER: "bg-slate-500/10 text-slate-600 dark:bg-slate-400/20 dark:text-slate-300 border-slate-400/30",
      BRONZE: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/30",
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyles[tier]}`}>
        <Award className="w-3 h-3" />
        {tier}
      </span>
    );
  };

  const columns: Column<DiscountRule>[] = [
    {
      header: "Rule Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">{row.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">ID: {row.id.substring(0, 8)}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Customer Tier",
      render: (row) => renderTierBadge(row.customerTier),
    },
    {
      header: "Category",
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {row.productCategory}
        </span>
      ),
    },
    {
      header: "Approval Threshold",
      render: (row) => (
        <span className="font-bold font-mono text-xs text-amber-600 dark:text-amber-400">
          &gt; {row.approvalThresholdPercent}%
        </span>
      ),
    },
    {
      header: "Max Allowed",
      render: (row) => (
        <span className="font-bold font-mono text-xs text-slate-900 dark:text-slate-100">
          {row.maxDiscountPercent}%
        </span>
      ),
    },
    {
      header: "Approval Role",
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
          <ShieldCheck className="w-3 h-3" />
          {row.approvalRoleRequired === "SALES_MANAGER" ? "Sales Manager" : "Finance"}
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
            onClick={() => handleEditClick(row)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg text-[#0D69B2] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            className={`p-1.5 rounded-lg transition-colors ${
              row.isActive
                ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
            title={row.isActive ? "Deactivate Rule" : "Reactivate Rule"}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteRule(row)}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete Rule"
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
        /* RULE TABLE VIEW */
        <div>
          <PageHeader
            badgeText="Discount Governance"
            title="Discount Rules & Governance Limits"
            description="Set tier-based discount ceilings, approval thresholds, and required reviewer roles (Sales Manager / Finance)."
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
                <span>Add Discount Rule</span>
              </button>
            }
          />

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-slate-500 font-medium">Total Rules</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{totalCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-emerald-600 font-medium">Active Rules</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{activeCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-blue-600 font-medium">Hardware Rules</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{hardwareCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-purple-600 font-medium">Services Rules</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{servicesCount}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs text-emerald-600 font-medium">Subscription Rules</div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{subscriptionsCount}</div>
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
                placeholder="Search rule name..."
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
                  <option value="BRONZE">Bronze</option>
                  <option value="SILVER">Silver</option>
                  <option value="GOLD">Gold</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
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

              {(searchQuery || tierFilter !== "ALL" || categoryFilter !== "ALL" || statusFilter !== "ALL") && (
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
                <p className="text-sm font-medium text-slate-500">Loading governance rules...</p>
              </div>
            ) : rules.length === 0 ? (
              <div className="py-12 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Sliders className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No rules found</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">Create a discount governance rule to set limits and thresholds.</p>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setViewMode("create");
                  }}
                  className="bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Discount Rule</span>
                </button>
              </div>
            ) : (
              <DataTable columns={columns} data={rules} />
            )}
          </div>
        </div>
      ) : (
        /* CREATE / EDIT RULE FORM */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PageHeader
            badgeText={viewMode === "edit" ? "Governance Rules" : "Rule Creation"}
            title={viewMode === "edit" ? "Edit Discount Rule" : "Add Discount Governance Rule"}
            description="Configure customer tier, product category, maximum discount percent, and approval trigger threshold."
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
                <span>Back to Rules</span>
              </button>
            }
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8 max-w-3xl mx-auto">
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Rule Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  placeholder="e.g. Gold Hardware Governance Rule"
                  className={`w-full px-4 py-3 rounded-xl border ${
                    formErrors.name ? "border-rose-500 bg-rose-50/50" : "border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800"
                  } text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]`}
                />
                {formErrors.name && <p className="text-xs text-rose-500 mt-1.5 font-medium">{formErrors.name}</p>}
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
                    Product Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formValues.productCategory}
                    onChange={(e) => setFormValues({ ...formValues, productCategory: e.target.value as ProductType })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                  >
                    <option value="HARDWARE">Hardware</option>
                    <option value="SERVICES">Services</option>
                    <option value="SUBSCRIPTIONS">Subscriptions</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Approval Threshold (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formValues.approvalThresholdPercent}
                    onChange={(e) => setFormValues({ ...formValues, approvalThresholdPercent: e.target.value })}
                    placeholder="e.g. 5.0"
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.approvalThresholdPercent
                        ? "border-rose-500 bg-rose-50/50"
                        : "border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800"
                    } text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]`}
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Discounts above this threshold trigger approval requirement.</span>
                  {formErrors.approvalThresholdPercent && (
                    <p className="text-xs text-rose-500 mt-1.5 font-medium">{formErrors.approvalThresholdPercent}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Maximum Allowed Discount (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formValues.maxDiscountPercent}
                    onChange={(e) => setFormValues({ ...formValues, maxDiscountPercent: e.target.value })}
                    placeholder="e.g. 10.0"
                    className={`w-full px-4 py-3 rounded-xl border ${
                      formErrors.maxDiscountPercent
                        ? "border-rose-500 bg-rose-50/50"
                        : "border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800"
                    } text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]`}
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Hard ceiling. Discounts above this are strictly rejected.</span>
                  {formErrors.maxDiscountPercent && (
                    <p className="text-xs text-rose-500 mt-1.5 font-medium">{formErrors.maxDiscountPercent}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Approval Role Required <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formValues.approvalRoleRequired}
                  onChange={(e) => setFormValues({ ...formValues, approvalRoleRequired: e.target.value as ApprovalRoleRequired })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                >
                  <option value="SALES_MANAGER">Sales Manager Approval</option>
                  <option value="FINANCE">Finance Approval</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">Rule Status</span>
                  <span className="text-[11px] text-slate-500">
                    {formValues.isActive ? "Enforced during quotation calculation" : "Rule disabled"}
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
                      <span>{viewMode === "edit" ? "Saving..." : "Creating Rule..."}</span>
                    </>
                  ) : (
                    <>
                      {viewMode === "edit" ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{viewMode === "edit" ? "Save Changes" : "Create Discount Rule"}</span>
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
