"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { ShieldCheck, Users, Package, Warehouse, Sliders, Zap, CheckCircle2 } from "lucide-react";

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SALES_MANAGER" | "SALES_REP" | "FINANCE" | "OPS";
  status: "Active" | "Pending Verification";
  lastLogin: string;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [adminTestResult, setAdminTestResult] = useState<string | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState(false);

  const [users, setUsers] = useState<SystemUser[]>([
    {
      id: "USR-001",
      name: "System Administrator",
      email: "admin@dealflow360.com",
      role: "ADMIN",
      status: "Active",
      lastLogin: "2026-09-05 14:10",
    },
    {
      id: "USR-002",
      name: "Sales Manager",
      email: "manager@dealflow360.com",
      role: "SALES_MANAGER",
      status: "Active",
      lastLogin: "2026-09-05 11:25",
    },
    {
      id: "USR-003",
      name: "Sales Rep",
      email: "sales@dealflow360.com",
      role: "SALES_REP",
      status: "Active",
      lastLogin: "2026-09-05 09:40",
    },
    {
      id: "USR-004",
      name: "Finance Controller",
      email: "finance@dealflow360.com",
      role: "FINANCE",
      status: "Active",
      lastLogin: "2026-09-04 18:30",
    },
    {
      id: "USR-005",
      name: "Operations Lead",
      email: "ops@dealflow360.com",
      role: "OPS",
      status: "Pending Verification",
      lastLogin: "2026-09-03 16:15",
    },
  ]);

  const testAdminApi = async () => {
    setTestingEndpoint(true);
    setAdminTestResult(null);
    const res = await apiClient.get("/admin/test");
    if (res.status === 200) {
      setAdminTestResult(`✅ HTTP 200 OK: ${JSON.stringify(res.data)}`);
    } else {
      setAdminTestResult(`❌ HTTP ${res.status}: ${res.error || "Forbidden"}`);
    }
    setTestingEndpoint(false);
  };

  const columns: Column<SystemUser>[] = [
    { header: "User ID", accessorKey: "id" },
    { header: "User Name", accessorKey: "name" },
    { header: "Email Address", accessorKey: "email" },
    {
      header: "Assigned Role",
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0D69B2]/10 text-[#0D69B2] dark:bg-[#0D69B2]/20 dark:text-blue-400 border border-[#0D69B2]/20">
          {row.role}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={row.status === "Active" ? "success" : "warning"}
          label={row.status}
        />
      ),
    },
    { header: "Last Activity", accessorKey: "lastLogin" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="System Governance"
        title="System Administration & Governance"
        description={`Manage enterprise users, role permissions, discount matrix thresholds, and fulfillment centers. Logged in as ${user?.email || "admin@dealflow360.com"}.`}
        actions={
          <button
            onClick={testAdminApi}
            disabled={testingEndpoint}
            className="inline-flex items-center gap-2 bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-bold rounded-xl px-5 py-2.5 text-sm shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap size={16} /> {testingEndpoint ? "Testing API..." : "Test Admin RBAC Guard"}
          </button>
        }
      />

      {adminTestResult && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 shadow-md">
          {adminTestResult}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Users
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              5
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-[#0D69B2] flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Catalog Items
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              4
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#F4882E]/10 text-[#F4882E] flex items-center justify-center">
            <Package size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Discount Rules
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              5 Tiers
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#EC2091]/10 text-[#EC2091] flex items-center justify-center">
            <Sliders size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fulfillment Hubs
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              2 Active
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Warehouse size={22} />
          </div>
        </div>
      </div>

      {/* System Users Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <ShieldCheck size={20} className="text-[#0D69B2]" />
          System Directory & Access Control
        </h3>
        <DataTable
          columns={columns}
          data={users}
          onView={(row) => alert(`Viewing user details: ${row.name}`)}
          onEdit={(row) => alert(`Modifying permissions for ${row.name}`)}
        />
      </div>
    </AppLayout>
  );
}
