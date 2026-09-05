"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { Check, X, ShieldAlert, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface PendingApproval {
  id: string;
  repName: string;
  client: string;
  quoteAmount: string;
  discountRequested: string;
  thresholdLimit: string;
  status: "Pending" | "Approved" | "Rejected";
}

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<PendingApproval[]>([
    {
      id: "REQ-901",
      repName: "Rahul Sharma",
      client: "Reliance Retail Pvt Ltd",
      quoteAmount: "$150,000",
      discountRequested: "18%",
      thresholdLimit: "15%",
      status: "Pending",
    },
    {
      id: "REQ-902",
      repName: "Priya Patel",
      client: "Tata Communications",
      quoteAmount: "$85,000",
      discountRequested: "20%",
      thresholdLimit: "15%",
      status: "Pending",
    },
    {
      id: "REQ-903",
      repName: "Amit Verma",
      client: "Infosys BPO",
      quoteAmount: "$210,000",
      discountRequested: "14%",
      thresholdLimit: "15%",
      status: "Approved",
    },
  ]);

  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "Approved" } : item))
    );
  };

  const handleReject = (id: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "Rejected" } : item))
    );
  };

  const columns: Column<PendingApproval>[] = [
    { header: "Request ID", accessorKey: "id" },
    { header: "Sales Rep", accessorKey: "repName" },
    { header: "Client Account", accessorKey: "client" },
    { header: "Quote Amount", accessorKey: "quoteAmount" },
    {
      header: "Requested Discount",
      render: (row) => (
        <span className="font-bold text-[#EC2091]">{row.discountRequested}</span>
      ),
    },
    { header: "Max Threshold", accessorKey: "thresholdLimit" },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={
            row.status === "Approved"
              ? "success"
              : row.status === "Rejected"
              ? "danger"
              : "warning"
          }
          label={row.status}
        />
      ),
    },
    {
      header: "Decision Action",
      align: "right",
      render: (row) =>
        row.status === "Pending" ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleApprove(row.id)}
              className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Check size={14} /> Approve
            </button>
            <button
              onClick={() => handleReject(row.id)}
              className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <X size={14} /> Reject
            </button>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-400">Decision Recorded</span>
        ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Managerial Overrides"
        title="Discount Over-Threshold Approvals"
        description={`Review team quotations requiring managerial discount overrides. Logged in as ${user?.email || "Sales Manager"}.`}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Approvals
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {approvals.filter((a) => a.status === "Pending").length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#F4882E]/10 text-[#F4882E] flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Approved Override Value
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              $210,000
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Avg Discount Approved
            </div>
            <div className="text-3xl font-extrabold text-[#0D69B2] mt-1">
              16.2%
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#0D69B2]/10 text-[#0D69B2] flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldAlert size={20} className="text-[#F4882E]" />
            Override Approval Queue
          </h3>
        </div>

        <DataTable columns={columns} data={approvals} />
      </div>
    </AppLayout>
  );
}
