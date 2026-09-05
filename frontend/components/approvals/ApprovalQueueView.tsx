"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { apiClient } from "@/lib/api-client";
import { CheckCircle2, XCircle, Clock, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/auth-context";

export interface ApprovalRequestItem {
  id: string;
  quotationId: string;
  requestedDiscount: number;
  requiredRole: "SALES_MANAGER" | "FINANCE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string;
  approverComment?: string;
  createdAt: string;
  updatedAt: string;
  quotation?: {
    quotationNumber: string;
    subtotal: number;
    discountTotal: number;
    grandTotal: number;
    currency: string;
    customer?: {
      name: string;
      tier: string;
    };
    salesRep?: {
      name: string;
      email: string;
    };
  };
  approver?: {
    name: string;
    email: string;
  };
}

interface ApprovalQueueViewProps {
  roleRequired?: "SALES_MANAGER" | "FINANCE";
  title?: string;
}

export default function ApprovalQueueView({
  roleRequired,
  title = "Approval Queue",
}: ApprovalQueueViewProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  // Modal State
  const [activeModal, setActiveModal] = useState<{
    request: ApprovalRequestItem;
    action: "APPROVE" | "REJECT";
  } | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter && statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      if (roleRequired) {
        params.role = roleRequired;
      }

      const res: any = await apiClient.get("/approvals", params);
      setRequests(Array.isArray(res) ? res : res.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch approval requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter, roleRequired]);

  const handleProcessApproval = async () => {
    if (!activeModal) return;
    setSubmitting(true);
    try {
      const endpoint =
        activeModal.action === "APPROVE"
          ? `/approvals/${activeModal.request.id}/approve`
          : `/approvals/${activeModal.request.id}/reject`;

      await apiClient.post(endpoint, { comment });

      setActiveModal(null);
      setComment("");
      await fetchApprovals();
    } catch (err: any) {
      alert(err.message || `Failed to ${activeModal.action.toLowerCase()} request`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<ApprovalRequestItem>[] = [
    {
      header: "Quotation #",
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 dark:text-white">
            {row.quotation?.quotationNumber || row.quotationId.slice(0, 8)}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {row.quotation?.customer?.name || "Customer N/A"} ({row.quotation?.customer?.tier || "Tier N/A"})
          </span>
        </div>
      ),
    },
    {
      header: "Sales Rep",
      render: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {row.quotation?.salesRep?.name || row.quotation?.salesRep?.email || "Sales Rep"}
        </span>
      ),
    },
    {
      header: "Req. Discount",
      render: (row) => (
        <span className="font-extrabold text-amber-600 dark:text-amber-400">
          {Number(row.requestedDiscount).toFixed(1)}%
        </span>
      ),
    },
    {
      header: "Total Value",
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-white">
          {row.quotation?.currency || "INR"} {Number(row.quotation?.grandTotal || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Required Role",
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          {row.requiredRole.replace("_", " ")}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => {
        const badgeType =
          row.status === "APPROVED"
            ? "success"
            : row.status === "REJECTED"
            ? "danger"
            : "warning";
        return <StatusBadge type={badgeType} label={row.status} />;
      },
    },
    {
      header: "Reason / Context",
      render: (row) => (
        <span className="text-xs text-slate-500 max-w-[200px] truncate block" title={row.reason || row.approverComment}>
          {row.reason || row.approverComment || "Discount exceeds auto-threshold"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (row) => {
        if (row.status !== "PENDING") {
          return (
            <span className="text-[11px] text-slate-400 italic">
              By: {row.approver?.name || row.approver?.email || "System"}
            </span>
          );
        }

        const canApprove =
          user?.role === "ADMIN" ||
          (user?.role === "SALES_MANAGER" && row.requiredRole === "SALES_MANAGER") ||
          (user?.role === "FINANCE" && row.requiredRole === "FINANCE");

        return (
          <div className="flex items-center gap-2">
            <button
              disabled={!canApprove}
              onClick={() => setActiveModal({ request: row, action: "APPROVE" })}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
            >
              Approve
            </button>
            <button
              disabled={!canApprove}
              onClick={() => setActiveModal({ request: row, action: "REJECT" })}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
            >
              Reject
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Discount Governance"
        title={title}
        description="Review, approve, or reject quotation discount governance requests based on assigned authority."
        actions={
          <button
            onClick={fetchApprovals}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 uppercase">Filter Status:</span>
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-[#0D69B2] text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <DataTable columns={columns} data={requests} />
      </div>

      {/* Approve / Reject Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              {activeModal.action === "APPROVE" ? (
                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                  <CheckCircle2 size={24} />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600">
                  <XCircle size={24} />
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {activeModal.action === "APPROVE" ? "Approve Discount" : "Reject Discount"}
                </h3>
                <p className="text-xs text-slate-500">
                  Quotation #{activeModal.request.quotation?.quotationNumber || activeModal.request.quotationId.slice(0, 8)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Discount:</span>
                <span className="font-bold text-amber-600">{Number(activeModal.request.requestedDiscount).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Grand Total:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {activeModal.request.quotation?.currency || "INR"} {Number(activeModal.request.quotation?.grandTotal || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Tier:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {activeModal.request.quotation?.customer?.tier || "Standard"}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Approver Notes / Reason (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter justification or comment for audit log..."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#0D69B2]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleProcessApproval}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer transition-all ${
                  activeModal.action === "APPROVE"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submitting ? "Processing..." : `Confirm ${activeModal.action === "APPROVE" ? "Approval" : "Rejection"}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
