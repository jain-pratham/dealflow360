"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  Users,
  UserCheck,
  ShieldCheck,
  Search,
  Edit2,
  Power,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Filter,
  Eye,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { getRoleDisplayName } from "@/lib/role-utils";

export type UserRole =
  | "ADMIN"
  | "SALES_REP"
  | "SALES_MANAGER"
  | "FINANCE"
  | "CUSTOMER";

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  createdAt: string;
  updatedAt?: string;
}

const ROLES_LIST: UserRole[] = [
  "ADMIN",
  "SALES_REP",
  "SALES_MANAGER",
  "FINANCE",
];

export default function TeamAndRolesPage() {
  const router = useRouter();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const res = await apiClient.get<TeamUser[]>("/users");
    if (Array.isArray(res.data)) {
      setUsers(res.data.filter((u) => u.role !== "CUSTOMER"));
    } else {
      showToast("error", res.error || "Failed to load team members.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInlineRoleChange = async (userId: string, newRole: UserRole) => {
    const res = await apiClient.patch<TeamUser>(`/users/${userId}/role`, {
      role: newRole,
    });

    if (res.data) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showToast(
        "success",
        `Role updated to ${newRole}. Notification email sent!`
      );
    } else {
      showToast("error", res.error || "Failed to change user role.");
    }
  };

  const handleToggleStatus = async (user: TeamUser) => {
    const newStatus = !user.isActive;
    const res = await apiClient.patch<TeamUser>(`/users/${user.id}/status`, {
      isActive: newStatus,
    });

    if (res.data) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
      showToast(
        "success",
        `User ${user.name} is now ${newStatus ? "Active" : "Inactive"}`
      );
    } else {
      showToast("error", res.error || "Failed to update user status.");
    }
  };

  // Filter users by search and role
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const columns: Column<TeamUser>[] = [
    {
      header: "User ID",
      render: (row) => (
        <span className="font-mono text-xs text-slate-500 font-semibold">
          {row.id.substring(0, 8)}
        </span>
      ),
    },
    {
      header: "Full Name",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#0D69B2]/10 text-[#0D69B2] dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              {row.name}
            </div>
            {row.isVerified ? (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Verified
              </span>
            ) : (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                Pending Verification
              </span>
            )}
          </div>
        </div>
      ),
    },
    { header: "Email Address", accessorKey: "email" },
    {
      header: "Role",
      render: (row) => (
        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
          <select
            value={row.role}
            onChange={(e) =>
              handleInlineRoleChange(row.id, e.target.value as UserRole)
            }
            className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-[#0D69B2] dark:text-blue-400 rounded-lg px-2.5 py-1 pr-7 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] cursor-pointer shadow-sm transition-all"
          >
            {ROLES_LIST.map((r) => (
              <option key={r} value={r} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {getRoleDisplayName(r)}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
            <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={row.isActive ? "success" : "danger"}
          label={row.isActive ? "Active" : "Inactive"}
        />
      ),
    },
    {
      header: "Created Date",
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(row.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Admin Governance"
        title="Team & Roles Management"
        description="Manage system users, enterprise role assignments, and security permissions."
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all transform animate-in slide-in-from-top-2 ${
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
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-[#0D69B2] rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Total Members
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {users.length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Active Accounts
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {users.filter((u) => u.isActive).length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Administrators
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {users.filter((u) => u.role === "ADMIN").length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search member name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
          >
            <option value="ALL">All Roles</option>
            {ROLES_LIST.map((r) => (
              <option key={r} value={r}>
                {getRoleDisplayName(r)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-7 h-7 animate-spin text-[#0D69B2] mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading team members...</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredUsers}
            onView={(row) => router.push(`/admin/users/${row.id}`)}
            onEdit={(row) => router.push(`/admin/users/${row.id}/edit`)}
            customActions={(row) => [
              {
                label: row.isActive ? "Deactivate User" : "Activate User",
                icon: <Power size={14} className={row.isActive ? "text-rose-500" : "text-emerald-500"} />,
                onClick: (r) => handleToggleStatus(r),
                variant: row.isActive ? "danger" : "primary",
              },
            ]}
          />
        )}
      </div>
    </AppLayout>
  );
}
