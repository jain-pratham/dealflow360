"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  GitCommit,
  Plus,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  Layers,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface ApprovalChainRecord {
  id: string;
  name: string;
  description?: string | null;
  requiredRole: "SALES_MANAGER" | "FINANCE";
  sequence: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminApprovalChainsPage() {
  const [chains, setChains] = useState<ApprovalChainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChain, setEditingChain] = useState<ApprovalChainRecord | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredRole, setRequiredRole] = useState<"SALES_MANAGER" | "FINANCE">("SALES_MANAGER");
  const [sequence, setSequence] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete State
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
      setSequence((chains.length > 0 ? Math.max(...chains.map((c) => c.sequence)) + 1 : 1));
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSaveChain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      requiredRole,
      sequence: Number(sequence),
      isActive,
    };

    try {
      let res;
      if (editingChain) {
        res = await apiClient.patch(`/approval-chains/${editingChain.id}`, payload);
      } else {
        res = await apiClient.post("/approval-chains", payload);
      }

      if (res.error) {
        setError(res.error);
      } else {
        setIsModalOpen(false);
        fetchChains();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save approval chain.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (chain: ApprovalChainRecord) => {
    setError(null);
    try {
      const res = await apiClient.patch(`/approval-chains/${chain.id}`, {
        isActive: !chain.isActive,
      });
      if (res.error) {
        setError(res.error);
      } else {
        fetchChains();
      }
    } catch (err: any) {
      setError(err.message || "Failed to update chain status.");
    }
  };

  const handleDeleteChain = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await apiClient.delete(`/approval-chains/${deleteTarget.id}`);
      if (res.error) {
        setError(res.error);
      } else {
        setDeleteTarget(null);
        fetchChains();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete approval chain.");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<ApprovalChainRecord>[] = [
    {
      header: "Sequence",
      render: (row) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-xs">
          #{row.sequence}
        </span>
      ),
    },
    {
      header: "Chain Name",
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {row.name}
          </div>
          {row.description && (
            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Required Role",
      render: (row) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            row.requiredRole === "FINANCE"
              ? "bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20"
              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
          }`}
        >
          {row.requiredRole}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <button
          onClick={() => handleToggleActive(row)}
          title="Click to toggle status"
          className="cursor-pointer"
        >
          <StatusBadge
            type={row.isActive ? "success" : "warning"}
            label={row.isActive ? "Active" : "Inactive"}
          />
        </button>
      ),
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenModal(row)}
            className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit size={13} />
            <span>Edit</span>
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Workflow Configuration"
        title="Approval Chain Orchestration"
        description="Configure dynamic multi-tier approval chains for commercial discount exceptions and governance rules."
        actions={
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add Approval Chain</span>
          </button>
        }
      />

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-blue-500" />
          <span>Loading approval chains...</span>
        </div>
      ) : chains.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <GitCommit size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No approval chains configured.
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Add custom approval chains to route quotation discount exceptions to Sales Managers or Finance.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl inline-flex items-center space-x-2"
          >
            <Plus size={15} />
            <span>Create First Approval Chain</span>
          </button>
        </div>
      ) : (
        <DataTable columns={columns} data={chains} />
      )}

      {/* Modal: Add / Edit Approval Chain */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck size={20} className="text-blue-500" />
              {editingChain ? "Edit Approval Chain" : "Add Approval Chain"}
            </h3>

            <form onSubmit={handleSaveChain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Chain Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tier 1: Standard Manager Approval"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Trigger / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Triggered when Rep discount exceeds category baseline (> 10%)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Required Role
                  </label>
                  <select
                    value={requiredRole}
                    onChange={(e) =>
                      setRequiredRole(e.target.value as "SALES_MANAGER" | "FINANCE")
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="SALES_MANAGER">SALES_MANAGER</option>
                    <option value="FINANCE">FINANCE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Sequence Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={sequence}
                    onChange={(e) => setSequence(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chainIsActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="chainIsActive" className="text-xs font-semibold text-slate-300">
                  Active (Participates in quotation approval evaluation)
                </label>
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
                  <span>Save Approval Chain</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Approval Chain</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <span className="font-bold">{deleteTarget.name}</span>?
              If this chain is referenced by historical approval requests, deletion will be blocked to preserve audit logs.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteChain}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center space-x-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
