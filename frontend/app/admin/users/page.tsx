"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { Users, UserCheck, ShieldCheck } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SALES_MANAGER" | "SALES_REP" | "FINANCE" | "CUSTOMER";
  status: "Active" | "Pending";
  lastActive: string;
}

export default function TeamAndRolesPage() {
  const teamMembers: TeamMember[] = [
    { id: "USR-001", name: "System Administrator", email: "admin@dealflow360.com", role: "ADMIN", status: "Active", lastActive: "Just now" },
    { id: "USR-002", name: "Sales Manager", email: "manager@dealflow360.com", role: "SALES_MANAGER", status: "Active", lastActive: "10 mins ago" },
    { id: "USR-003", name: "Sales Representative", email: "sales@dealflow360.com", role: "SALES_REP", status: "Active", lastActive: "1 hour ago" },
    { id: "USR-004", name: "Finance Controller", email: "finance@dealflow360.com", role: "FINANCE", status: "Active", lastActive: "2 hours ago" },
    { id: "USR-005", name: "Acme Customer", email: "customer@dealflow360.com", role: "CUSTOMER", status: "Active", lastActive: "Yesterday" },
  ];

  const columns: Column<TeamMember>[] = [
    { header: "User ID", accessorKey: "id" },
    { header: "Full Name", accessorKey: "name" },
    { header: "Email Address", accessorKey: "email" },
    {
      header: "Role",
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0D69B2]/10 text-[#0D69B2] dark:bg-[#0D69B2]/20 dark:text-blue-400 border border-[#0D69B2]/20">
          {row.role}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge type={row.status === "Active" ? "success" : "warning"} label={row.status} />
      ),
    },
    { header: "Last Active", accessorKey: "lastActive" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Admin Governance"
        title="Team & Roles Management"
        description="Manage system users, enterprise role assignments, and security permissions."
      />
      <div className="space-y-4">
        <DataTable columns={columns} data={teamMembers} />
      </div>
    </AppLayout>
  );
}
