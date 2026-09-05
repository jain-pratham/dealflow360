"use client";

import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";

interface CustomerRecord {
  id: string;
  companyName: string;
  contactEmail: string;
  tier: "GOLD" | "SILVER" | "BRONZE";
  status: "Active" | "Inactive";
}

export default function AdminCustomersPage() {
  const customers: CustomerRecord[] = [
    { id: "CUST-101", companyName: "Acme Logistics Corp", contactEmail: "contact@acme.com", tier: "GOLD", status: "Active" },
    { id: "CUST-102", companyName: "Global Tech Solutions", contactEmail: "info@globaltech.com", tier: "GOLD", status: "Active" },
    { id: "CUST-103", companyName: "Apex Health Networks", contactEmail: "procurement@apexhealth.com", tier: "SILVER", status: "Active" },
  ];

  const columns: Column<CustomerRecord>[] = [
    { header: "ID", accessorKey: "id" },
    { header: "Company Name", accessorKey: "companyName" },
    { header: "Contact Email", accessorKey: "contactEmail" },
    {
      header: "Tier",
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F4882E]/10 text-[#F4882E]">
          {row.tier}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => <StatusBadge type="success" label={row.status} />,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Customer Directory"
        title="Customers & Account Governance"
        description="View and configure enterprise customer accounts, tiers, and pricing levels."
      />
      <DataTable columns={columns} data={customers} />
    </AppLayout>
  );
}
