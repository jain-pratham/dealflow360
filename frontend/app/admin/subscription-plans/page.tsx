"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { FormModal, FormField, Input, Select } from "@/components/ui/FormModal";
import { apiClient } from "@/lib/api-client";
import { Plus, Edit2, CheckCircle2, AlertCircle, RefreshCw, X, ShieldAlert } from "lucide-react";

interface SubPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: "MONTHLY" | "YEARLY";
  prorationPolicy: string;
  refundPolicy: string;
  isActive: boolean;
  createdAt?: string;
}

export default function AdminSubscriptionPlansPage() {
  const [plans, setPlans] = useState<SubPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<SubPlan | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form fields state
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("INR");
  const [interval, setInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [prorationPolicy, setProrationPolicy] = useState<string>("EXACT_DAY_PRO_RATA");
  const [refundPolicy, setRefundPolicy] = useState<string>("PARTIAL_CREDIT_NOTE");
  const [isActive, setIsActive] = useState<boolean>(true);

  // Validation Errors state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: SubPlan[] }>("/subscription-plans");
      if (res.data && Array.isArray((res.data as any).data)) {
        setPlans((res.data as any).data);
      } else if (Array.isArray(res.data)) {
        setPlans(res.data as any);
      } else {
        setPlans([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load subscription plans.");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setName("");
    setDescription("");
    setPrice(0);
    setCurrency("INR");
    setInterval("MONTHLY");
    setProrationPolicy("EXACT_DAY_PRO_RATA");
    setRefundPolicy("PARTIAL_CREDIT_NOTE");
    setIsActive(true);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: SubPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description || "");
    setPrice(plan.price || 0);
    setCurrency(plan.currency || "INR");
    setInterval(plan.interval || "MONTHLY");
    setProrationPolicy(plan.prorationPolicy || "EXACT_DAY_PRO_RATA");
    setRefundPolicy(plan.refundPolicy || "PARTIAL_CREDIT_NOTE");
    setIsActive(plan.isActive);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (plan: SubPlan) => {
    const nextStatus = !plan.isActive;
    try {
      const res = await apiClient.patch<SubPlan>(`/subscription-plans/${plan.id}/status`, {
        isActive: nextStatus,
      });
      if (res.data) {
        showToast("success", `Plan '${plan.name}' is now ${nextStatus ? "ACTIVE" : "INACTIVE"}.`);
        fetchPlans();
      } else {
        showToast("error", res.error || "Failed to update plan status.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to update plan status.");
    }
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Plan name is required.";
    if (price < 0) errs.price = "Price cannot be negative.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    if (!validateForm()) return;

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: Number(price),
      currency,
      interval,
      prorationPolicy,
      refundPolicy,
      isActive,
    };

    try {
      if (editingPlan) {
        const res = await apiClient.patch<SubPlan>(`/subscription-plans/${editingPlan.id}`, payload);
        if (res.data) {
          showToast("success", `Subscription plan '${res.data.name}' updated successfully.`);
          setIsModalOpen(false);
          fetchPlans();
        } else {
          showToast("error", res.error || "Failed to update subscription plan.");
        }
      } else {
        const res = await apiClient.post<SubPlan>("/subscription-plans", payload);
        if (res.data) {
          showToast("success", `Subscription plan '${res.data.name}' created successfully.`);
          setIsModalOpen(false);
          fetchPlans();
        } else {
          showToast("error", res.error || "Failed to create subscription plan.");
        }
      }
    } catch (err: any) {
      showToast("error", err.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<SubPlan>[] = [
    {
      header: "Plan ID",
      render: (row) => <span className="font-mono text-xs text-slate-500">{row.id.slice(0, 8)}...</span>,
    },
    {
      header: "Plan Name",
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100">{row.name}</span>
          {row.description && <p className="text-[11px] text-slate-400 font-medium">{row.description}</p>}
        </div>
      ),
    },
    {
      header: "Billing Interval",
      render: (row) => (
        <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs">
          {row.interval}
        </span>
      ),
    },
    {
      header: "Proration Policy",
      render: (row) => <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{row.prorationPolicy}</span>,
    },
    {
      header: "Refund Policy",
      render: (row) => <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{row.refundPolicy}</span>,
    },
    {
      header: "Status",
      render: (row) => <StatusBadge type={row.isActive ? "success" : "danger"} label={row.isActive ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Edit Plan"
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
              row.isActive
                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}
          >
            {row.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-slate-900 text-emerald-300 border-emerald-500/30"
              : "bg-slate-900 text-rose-300 border-rose-500/30"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <PageHeader
        badgeText="Recurring Revenue"
        title="Subscription Plan Configuration"
        description="Set up recurring billing cycles, proration algorithms, and automated renewal terms backed by database rules."
        actions={
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="bg-[#0D69B2] hover:bg-[#0b5a99] active:scale-[0.99] transition-all text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Subscription Plan</span>
          </button>
        }
      />

      {loading ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-[#0D69B2] mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading subscription plans catalog...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-2xl max-w-lg mx-auto">
          <ShieldAlert size={36} className="text-rose-500 mx-auto mb-2" />
          <h4 className="font-bold text-slate-900 dark:text-white">Error Loading Plans</h4>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
      ) : (
        <DataTable columns={columns} data={plans} />
      )}

      {/* Plan Form Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
        subtitle="Configure billing cycle interval, proration policy, and refund rules."
        onSubmit={handleSubmitForm}
        submitText={editingPlan ? "Update Plan" : "Create Plan"}
        loading={submitting}
      >
        <div className="md:col-span-2">
          <FormField label="Plan Name" required error={formErrors.name}>
            <Input
              type="text"
              placeholder="e.g. Monthly Enterprise Subscription"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
        </div>

        <div className="md:col-span-2">
          <FormField label="Description">
            <Input
              type="text"
              placeholder="Brief summary of included features or SLA..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Billing Interval" required>
          <Select value={interval} onChange={(e) => setInterval(e.target.value as any)}>
            <option value="MONTHLY">MONTHLY</option>
            <option value="YEARLY">YEARLY</option>
          </Select>
        </FormField>

        <FormField label="Default Plan Price" error={formErrors.price}>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
          />
        </FormField>

        <FormField label="Proration Policy" required>
          <Select value={prorationPolicy} onChange={(e) => setProrationPolicy(e.target.value)}>
            <option value="EXACT_DAY_PRO_RATA">EXACT_DAY_PRO_RATA</option>
            <option value="MONTHLY_PRO_RATA">MONTHLY_PRO_RATA</option>
          </Select>
        </FormField>

        <FormField label="Refund Policy" required>
          <Select value={refundPolicy} onChange={(e) => setRefundPolicy(e.target.value)}>
            <option value="PARTIAL_CREDIT_NOTE">PARTIAL_CREDIT_NOTE</option>
            <option value="NON_REFUNDABLE">NON_REFUNDABLE</option>
          </Select>
        </FormField>

        <div className="md:col-span-2">
          <FormField label="Active Status">
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#0D69B2] rounded focus:ring-[#0D69B2]"
                />
                <span>Active (Available for selection in new recurring quotations)</span>
              </label>
            </div>
          </FormField>
        </div>
      </FormModal>
    </AppLayout>
  );
}
