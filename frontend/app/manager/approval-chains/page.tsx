"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/DataTable";
import { FormModal, FormField, Input, Select } from "@/components/ui/FormModal";
import {
  GitCommit,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface ApprovalChainRecord {
  id: string;
  name: string;
  description?: string | null;
  requiredRole: "SALES_MANAGER" | "FINANCE";
  sequence: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function ManagerApprovalChainsPage() {
  const [chains, setChains] = useState<ApprovalChainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChain, setEditingChain] = useState<ApprovalChainRecord | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredRole, setRequiredRole] = useState<"SALES_MANAGER" | "FINANCE">("SALES_MANAGER");
  const [sequence, setSequence] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Detail Modal State (View)
  const [viewingChain, setViewingChain] = useState<ApprovalChainRecord | null>(null);

  // Delete Confirm Modal State
  const [deleteTarget, setDeleteTarget] = useState<ApprovalChainRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchChains = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ApprovalChainRecord[]>("/approval-chains");
      if (res.error) {
        setError(res.error);
      } else {
        setChains(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load approval chains.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChains();
  }, []);

  const handleOpenModal = (chain?: ApprovalChainRecord) => {
    setError(null);
    setSuccess(null);
    if (chain) {
      setEditingChain(chain);
      setName(chain.name);
      setDescription(chain.description || "");
      setRequiredRole(chain.requiredRole);
      setSequence(chain.sequence);
      setIsActive(chain.isActive);
    } else {
      setEditingChain(null);
      setName("");
      setDescription("");
      setRequiredRole("SALES_MANAGER");
      setSequence(chains.length > 0 ? Math.max(...chains.map((c) => c.sequence)) + 1 : 1);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSaveChain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      requiredRole,
      sequence: Number(sequence),
      isActive,
    };

    try {
      if (editingChain) {
        const res = await apiClient.patch<ApprovalChainRecord>(
          `/approval-chains/${editingChain.id}`,
          payload
        );
        if (res.error) {
          setError(res.error);
        } else {
          setSuccess(`Approval chain '${editingChain.name}' updated successfully.`);
          setIsModalOpen(false);
          await fetchChains();
        }
      } else {
        const res = await apiClient.post<ApprovalChainRecord>("/approval-chains", payload);
        if (res.error) {
          setError(res.error);
        } else {
          setSuccess("New approval chain created successfully.");
          setIsModalOpen(false);
          await fetchChains();
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while saving approval chain.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (chain: ApprovalChainRecord) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.patch<ApprovalChainRecord>(`/approval-chains/${chain.id}`, {
        isActive: !chain.isActive,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(
          `Approval chain '${chain.name}' ${!chain.isActive ? "activated" : "deactivated"} successfully.`
        );
        await fetchChains();
      }
    } catch (err: any) {
      setError(err.message || "Failed to update chain status.");
    }
  };

  const handleDeleteChain = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await apiClient.delete(`/approval-chains/${deleteTarget.id}`);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`Approval chain '${deleteTarget.name}' deleted successfully.`);
        setDeleteTarget(null);
        await fetchChains();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete approval chain.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        badgeText="Approval Matrix"
        title="Manager Approval Chains"
        description="Configure sequential approval levels and governance roles for commercial proposals."
        actions={
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#0D69B2] hover:bg-[#0b5998] text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Approval Chain</span>
          </button>
        }
      />

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#0D69B2]" />
            <span>Active Escalation Hierarchy</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Total Chains: {chains.length}
          </span>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 dark:text-red-400 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <span>{success}</span>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-[#0D69B2]" />
            <span>Loading approval hierarchy...</span>
          </div>
        ) : chains.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <ShieldCheck size={32} className="mx-auto text-slate-400" />
            <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              No approval chains configured.
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click below to create the first sequential approval tier for sales governance.
            </p>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 bg-[#0D69B2] hover:bg-[#0b5998] text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Approval Chain</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {chains.map((chain) => (
              <div
                key={chain.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-600"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-xs shrink-0 mt-0.5 border border-blue-500/20">
                    #{chain.sequence}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {chain.name}
                      </span>
                    </div>
                    {chain.description && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {chain.description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                      chain.requiredRole === "FINANCE"
                        ? "bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    }`}
                  >
                    {chain.requiredRole}
                  </span>

                  <StatusBadge
                    type={chain.isActive ? "success" : "warning"}
                    label={chain.isActive ? "Active" : "Inactive"}
                  />

                  {/* Actions */}
                  <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setViewingChain(chain)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenModal(chain)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                      title="Edit Chain"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(chain)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        chain.isActive
                          ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                          : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                      }`}
                      title={chain.isActive ? "Deactivate Chain" : "Activate Chain"}
                    >
                      {chain.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(chain)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                      title="Delete Chain"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Form Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingChain ? "Edit Approval Chain" : "Create Approval Chain"}
        subtitle={
          editingChain
            ? `Update settings for sequence #${editingChain.sequence}`
            : "Define a new sequential approval level for sales proposals."
        }
        onSubmit={handleSaveChain}
        submitText={saving ? "Saving..." : editingChain ? "Update Chain" : "Create Chain"}
        loading={saving}
      >
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Chain Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Manager Approval"
            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-[#0D69B2] focus:ring-1 focus:ring-[#0D69B2] transition-colors"
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Triggered when quotation discount exceeds 5%"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-[#0D69B2] focus:ring-1 focus:ring-[#0D69B2] transition-colors resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Required Role <span className="text-red-500">*</span>
          </label>
          <select
            value={requiredRole}
            onChange={(e) => setRequiredRole(e.target.value as any)}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-[#0D69B2] focus:ring-1 focus:ring-[#0D69B2] transition-colors"
          >
            <option value="SALES_MANAGER">SALES_MANAGER</option>
            <option value="FINANCE">FINANCE</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Sequence Order <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            required
            value={sequence}
            onChange={(e) => setSequence(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-[#0D69B2] focus:ring-1 focus:ring-[#0D69B2] transition-colors"
          />
        </div>

        <div className="col-span-2 pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Active Status
            </div>
            <div className="text-[11px] text-slate-500">
              Active chains participate in sequential approval routing.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}
          >
            {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <span>{isActive ? "Active" : "Inactive"}</span>
          </button>
        </div>
      </FormModal>

      {/* View Detail Modal */}
      {viewingChain && (
        <FormModal
          isOpen={!!viewingChain}
          onClose={() => setViewingChain(null)}
          title={`Approval Chain: ${viewingChain.name}`}
          subtitle={`Details for sequence #${viewingChain.sequence}`}
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            setViewingChain(null);
          }}
          submitText="Close"
        >
          <div className="col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 block">Sequence Position</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-base">
                  #{viewingChain.sequence}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 block">Required Role</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-base">
                  {viewingChain.requiredRole}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                {viewingChain.description || "No description provided."}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500">Status</span>
              <StatusBadge
                type={viewingChain.isActive ? "success" : "warning"}
                label={viewingChain.isActive ? "Active" : "Inactive"}
              />
            </div>
          </div>
        </FormModal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <FormModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Confirm Delete Approval Chain"
          subtitle={`Are you sure you want to delete '${deleteTarget.name}'?`}
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            handleDeleteChain();
          }}
          submitText={deleting ? "Deleting..." : "Delete Chain"}
          loading={deleting}
        >
          <div className="col-span-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <span>Historical Deletion Safety Warning</span>
            </div>
            <p>
              If this approval chain is referenced by existing historical quotation approval requests,
              the system will reject physical deletion to preserve audit history. Deactivate the chain instead if needed.
            </p>
          </div>
        </FormModal>
      )}
    </AppLayout>
  );
}
