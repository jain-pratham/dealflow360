"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { FormModal, FormField, Input, Select } from "@/components/ui/FormModal";
import { Mail, CheckCircle2, Plus, ArrowUpRight, Clock, DollarSign, Filter } from "lucide-react";

interface DealQuote {
  id: string;
  client: string;
  dealValue: string;
  discount: string;
  status: "Active" | "Pending" | "Approved";
  createdDate: string;
}

export default function SalesDashboardPage() {
  const router = useRouter();
  const { user, refreshMe } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [quotes, setQuotes] = useState<DealQuote[]>([
    {
      id: "Q-2026-001",
      client: "Acme Logistics Corp",
      dealValue: "$48,500",
      discount: "12%",
      status: "Pending",
      createdDate: "2026-09-04",
    },
    {
      id: "Q-2026-002",
      client: "Global Tech Solutions",
      dealValue: "$120,000",
      discount: "8%",
      status: "Approved",
      createdDate: "2026-09-02",
    },
    {
      id: "Q-2026-003",
      client: "Apex Health Networks",
      dealValue: "$32,000",
      discount: "15%",
      status: "Active",
      createdDate: "2026-09-01",
    },
  ]);

  const handleSimulateVerification = async () => {
    setVerifying(true);
    setVerifySuccess(null);
    const res = await apiClient.get<{ message: string }>(
      `/auth/verify-email?token=simulated_token`
    );
    if (res.status === 200 || res.status === 404) {
      await refreshMe();
      setVerifySuccess("Email verification successful! Full CRM access unlocked.");
    }
    setVerifying(false);
  };

  const columns: Column<DealQuote>[] = [
    { header: "Quote ID", accessorKey: "id" },
    { header: "Client / Account", accessorKey: "client" },
    { header: "Deal Value", accessorKey: "dealValue" },
    { header: "Discount %", accessorKey: "discount" },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={
            row.status === "Approved"
              ? "success"
              : row.status === "Pending"
              ? "warning"
              : "primary"
          }
          label={row.status}
        />
      ),
    },
    { header: "Created Date", accessorKey: "createdDate" },
  ];

  return (
    <AppLayout>
      {/* Elevated Page Header */}
      <PageHeader
        badgeText="Sales Operations"
        title="Quotations & Pipeline"
        description={`Welcome back, ${user?.name || "Sales Rep"} (${user?.email}). Manage your active deal quotes and managerial override requests.`}
        actions={
          <>
            <button className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl px-4 py-2.5 text-sm transition-all cursor-pointer">
              <Filter size={16} /> Filters
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-bold rounded-xl px-5 py-2.5 text-sm shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus size={16} /> Create New Quote
            </button>
          </>
        }
      />

      {/* Email Verification Banner */}
      {user && !user.isVerified && (
        <div className="mb-6 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Mail className="text-amber-500 shrink-0 mt-0.5" size={22} />
            <div>
              <h3 className="font-semibold text-amber-950 dark:text-amber-100 text-sm">
                Account Pending Verification (Read-Only Mode)
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">
                Your email address <strong>{user.email}</strong> is not verified yet.
                You are currently operating in restricted read-only mode.
              </p>
            </div>
          </div>

          <button
            onClick={handleSimulateVerification}
            disabled={verifying}
            className="whitespace-nowrap px-4 py-2 rounded-xl bg-[#F4882E] hover:bg-[#e07722] text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {verifying ? "Verifying..." : "Simulate Email Verification"}
          </button>
        </div>
      )}

      {verifySuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs md:text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> {verifySuccess}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Active Quotations
            <ArrowUpRight size={18} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            12
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-semibold">
            ↑ 4 created this week
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Pending Approvals
            <Clock size={18} className="text-[#F4882E]" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            2
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-semibold">
            Awaiting Manager Review
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Quota Attainment
            <DollarSign size={18} className="text-[#0D69B2]" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            78%
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold">
            $156,000 / $200,000
          </div>
        </div>
      </div>

      {/* CRM Data Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
          Recent Quotations List
        </h3>
        <DataTable
          columns={columns}
          data={quotes}
          onView={(row) => alert(`Viewing details for ${row.id}`)}
          onEdit={(row) => alert(`Editing quote ${row.id}`)}
          onDelete={(row) =>
            setQuotes((prev) => prev.filter((q) => q.id !== row.id))
          }
        />
      </div>

      {/* New Quote Form Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Quotation"
        subtitle="Fill in client details and requested discount percentages for approval."
        onSubmit={() => {
          alert("New Quote Created Successfully!");
          setIsModalOpen(false);
        }}
        submitText="Submit Quote"
      >
        <FormField label="Client Name">
          <Input placeholder="e.g. Acme Corporation" required />
        </FormField>

        <FormField label="Deal Value ($)">
          <Input type="number" placeholder="50000" required />
        </FormField>

        <FormField label="Requested Discount %">
          <Input type="number" placeholder="10" required />
        </FormField>

        <FormField label="Priority Tier">
          <Select defaultValue="Standard">
            <option value="Standard">Standard</option>
            <option value="High">High Priority</option>
            <option value="Urgent">Urgent Managerial Review</option>
          </Select>
        </FormField>
      </FormModal>
    </AppLayout>
  );
}
