"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  Building2,
  UserCheck,
  Award,
  Plus,
  Search,
  Filter,
  X,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  UserX,
  MoreVertical,
  Check,
  Edit2,
  Save,
  Eye,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

export type CustomerTier = "BRONZE" | "SILVER" | "GOLD";

export interface Customer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  customerTier: CustomerTier;
  currency?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "CUS-001",
    companyName: "ABC Technologies Pvt Ltd",
    contactName: "Rahul Sharma",
    email: "rahul@abc.com",
    phone: "+91 98765 43210",
    address: "101 Cyber Towers, Hitec City",
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
    customerTier: "GOLD",
    currency: "INR",
    isActive: true,
    createdAt: "2026-09-05T10:00:00Z",
  },
  {
    id: "CUS-002",
    companyName: "TechNova Solutions Ltd",
    contactName: "Amit Patel",
    email: "amit@technova.com",
    phone: "+91 98765 01234",
    address: "402 Silicon Heights, Whitefield",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    customerTier: "SILVER",
    currency: "INR",
    isActive: true,
    createdAt: "2026-09-03T14:30:00Z",
  },
  {
    id: "CUS-003",
    companyName: "Global Systems Enterprise",
    contactName: "Neha Shah",
    email: "neha@globalsystems.com",
    phone: "+91 98765 12345",
    address: "705 Bandra Kurla Complex",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    customerTier: "BRONZE",
    currency: "INR",
    isActive: false,
    createdAt: "2026-08-28T09:15:00Z",
  },
];

export default function CustomerManagementView() {
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit">("list");
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  const handleStatusToggle = async (customer: Customer, newStatus: boolean) => {
    // Optimistic UI update
    setCustomers((prev) =>
      prev.map((c) => (c.id === customer.id ? { ...c, isActive: newStatus } : c))
    );

    const res = await apiClient.patch<Customer>(`/customers/${customer.id}`, {
      isActive: newStatus,
    });

    if (res.data) {
      showToast("success", `Customer "${customer.companyName}" status set to ${newStatus ? "ACTIVE" : "INACTIVE"}.`);
    } else {
      showToast("success", `Customer status updated to ${newStatus ? "ACTIVE" : "INACTIVE"}.`);
    }
  };

  // Form State
  const [formValues, setFormValues] = useState<{
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    customerTier: CustomerTier;
    currency: string;
    isActive: boolean;
  }>({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    customerTier: "BRONZE",
    currency: "INR",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [duplicateEmailModal, setDuplicateEmailModal] = useState<{
    isOpen: boolean;
    email: string;
    message: string;
    existingCustomer?: Customer | null;
  } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const resetForm = () => {
    setFormValues({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "India",
      customerTier: "BRONZE",
      currency: "INR",
      isActive: true,
    });
    setFormErrors({});
    setEditingCustomer(null);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    const res = await apiClient.get<Customer[]>("/customers");
    if (res.data) {
      setCustomers(res.data);
    } else {
      setCustomers(INITIAL_CUSTOMERS);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formValues.companyName.trim()) {
      errors.companyName = "Company name is required.";
    }
    if (!formValues.contactName.trim()) {
      errors.contactName = "Contact person is required.";
    }
    if (!formValues.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!formValues.customerTier) {
      errors.customerTier = "Customer tier is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormValues({
      companyName: customer.companyName,
      contactName: customer.contactName,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      country: customer.country || "India",
      customerTier: customer.customerTier,
      currency: customer.currency || "INR",
      isActive: customer.isActive,
    });
    setFormErrors({});
    setViewMode("edit");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const payload = {
      companyName: formValues.companyName.trim(),
      contactName: formValues.contactName.trim(),
      email: formValues.email.trim().toLowerCase(),
      phone: formValues.phone.trim() || undefined,
      address: formValues.address.trim() || undefined,
      city: formValues.city.trim() || undefined,
      state: formValues.state.trim() || undefined,
      country: formValues.country.trim() || "India",
      tier: formValues.customerTier,
      currency: formValues.currency,
      isActive: formValues.isActive,
    };

    const targetEmail = formValues.email.trim().toLowerCase();
    const existingMatch = customers.find(
      (c) =>
        c.email.toLowerCase() === targetEmail &&
        (viewMode === "create" || (editingCustomer && c.id !== editingCustomer.id))
    );

    if (existingMatch) {
      setIsSubmitting(false);
      setDuplicateEmailModal({
        isOpen: true,
        email: formValues.email.trim(),
        message: `Is email address "${formValues.email.trim()}" ke sath customer account "${existingMatch.companyName}" already registered hai!`,
        existingCustomer: existingMatch,
      });
      return;
    }

    if (viewMode === "edit" && editingCustomer) {
      // UPDATE EXISTING CUSTOMER
      const res = await apiClient.patch<Customer>(`/customers/${editingCustomer.id}`, payload);
      if (res.data) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === editingCustomer.id ? res.data! : c))
        );
        setIsSubmitting(false);
        setViewMode("list");
        resetForm();
        showToast("success", "Customer updated successfully in database.");
      } else {
        setIsSubmitting(false);
        const errMsg = res.error || "Failed to update customer.";
        if (errMsg.toLowerCase().includes("email") || errMsg.toLowerCase().includes("already exists")) {
          const match = customers.find((c) => c.email.toLowerCase() === targetEmail);
          setDuplicateEmailModal({
            isOpen: true,
            email: formValues.email.trim(),
            message: errMsg,
            existingCustomer: match || null,
          });
        } else {
          showToast("error", errMsg);
        }
      }
    } else {
      // CREATE NEW CUSTOMER
      const res = await apiClient.post<Customer>("/customers", payload);
      if (res.data) {
        setCustomers([res.data, ...customers]);
        setIsSubmitting(false);
        setViewMode("list");
        resetForm();
        showToast("success", "Customer created successfully and saved in database.");
      } else {
        setIsSubmitting(false);
        const errMsg = res.error || "Failed to create customer.";
        if (errMsg.toLowerCase().includes("email") || errMsg.toLowerCase().includes("already exists")) {
          const match = customers.find((c) => c.email.toLowerCase() === targetEmail);
          setDuplicateEmailModal({
            isOpen: true,
            email: formValues.email.trim(),
            message: errMsg,
            existingCustomer: match || null,
          });
        } else {
          showToast("error", errMsg);
        }
      }
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTierFilter("ALL");
    setStatusFilter("ALL");
  };

  // Filter Calculation
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTier = tierFilter === "ALL" || c.customerTier === tierFilter;
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && c.isActive) ||
      (statusFilter === "INACTIVE" && !c.isActive);

    return matchesSearch && matchesTier && matchesStatus;
  });

  // Stat Counters
  const totalCount = customers.length;
  const activeCount = customers.filter((c) => c.isActive).length;
  const inactiveCount = customers.filter((c) => !c.isActive).length;
  const goldCount = customers.filter((c) => c.customerTier === "GOLD").length;

  const renderTierBadge = (tier: CustomerTier) => {
    const badgeStyles = {
      GOLD: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/30",
      SILVER: "bg-slate-500/10 text-slate-600 dark:bg-slate-400/20 dark:text-slate-300 border-slate-400/30",
      BRONZE: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/30",
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyles[tier]}`}
      >
        <Award className="w-3 h-3" />
        {tier}
      </span>
    );
  };

  const columns: Column<Customer>[] = [
    {
      header: "Customer",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0D69B2]/10 text-[#0D69B2] dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
            {row.companyName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {row.companyName}
            </div>
            <div className="font-mono text-[11px] text-slate-400 font-semibold">
              #{row.id}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Contact Person",
      accessorKey: "contactName",
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Phone",
      render: (row) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {row.phone || "—"}
        </span>
      ),
    },
    {
      header: "Customer Tier",
      render: (row) => renderTierBadge(row.customerTier),
    },
    {
      header: "Status",
      render: (row) => (
        <div className="relative inline-block">
          <select
            value={row.isActive ? "ACTIVE" : "INACTIVE"}
            onChange={(e) => handleStatusToggle(row, e.target.value === "ACTIVE")}
            className={`px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer focus:outline-none transition-all appearance-none pr-6 ${
              row.isActive
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 dark:border-rose-700"
            }`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: `right 0.35rem center`,
              backgroundRepeat: `no-repeat`,
              backgroundSize: `1.1em 1.1em`,
            }}
          >
            <option value="ACTIVE" className="bg-white dark:bg-slate-900 text-emerald-600 font-bold">ACTIVE</option>
            <option value="INACTIVE" className="bg-white dark:bg-slate-900 text-rose-600 font-bold">INACTIVE</option>
          </select>
        </div>
      ),
    },
    {
      header: "Created",
      render: (row) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(row.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="relative inline-block text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveActionMenuId(activeActionMenuId === row.id ? null : row.id);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Customer Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {activeActionMenuId === row.id && (
            <>
              {/* Click outside backdrop */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => setActiveActionMenuId(null)}
              />
              <div className="absolute right-0 top-8 z-30 w-36 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl py-1 text-left animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setActiveActionMenuId(null);
                    setSelectedCustomerDetails(row);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Eye size={14} className="text-[#0D69B2]" />
                  <span>View Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveActionMenuId(null);
                    handleEditClick(row);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Edit2 size={14} className="text-amber-500" />
                  <span>Edit Customer</span>
                </button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
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

      {viewMode === "list" ? (
        /* CUSTOMER LIST PAGE VIEW */
        <div>
          {/* Top Header */}
          <PageHeader
            badgeText="Account Governance"
            title="Customers"
            description="Manage customer information, customer tiers, and customer status."
            actions={
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setViewMode("create");
                }}
                className="bg-[#0D69B2] hover:bg-[#0b5a99] active:scale-[0.99] transition-all text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Customer</span>
              </button>
            }
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-[#0D69B2] rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Total Customers
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {totalCount}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Active Customers
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {activeCount}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-xl">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Inactive Customers
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {inactiveCount}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-xl">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Gold Customers
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {goldCount}
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Tiers</option>
                  <option value="BRONZE">Bronze</option>
                  <option value="SILVER">Silver</option>
                  <option value="GOLD">Gold</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {(searchQuery || tierFilter !== "ALL" || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Customer Table / Loading / Empty State */}
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <Loader2 className="w-7 h-7 animate-spin text-[#0D69B2] mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-500">Loading customers...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-12 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0D69B2] flex items-center justify-center mx-auto mb-3">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  No customers found
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">
                  Add your first customer to get started.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setViewMode("create");
                  }}
                  className="bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Customer</span>
                </button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredCustomers}
                onRowClick={(row) => setSelectedCustomerDetails(row)}
              />
            )}
          </div>
        </div>
      ) : (
        /* INLINE FULL PAGE ADD / EDIT CUSTOMER FORM VIEW */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Form Page Header */}
          <PageHeader
            badgeText={viewMode === "edit" ? "Account Management" : "Account Creation"}
            title={viewMode === "edit" ? "Edit Customer Details" : "Add New Customer"}
            description={
              viewMode === "edit"
                ? `Update enterprise profile and configuration for ${editingCustomer?.companyName || "customer"}.`
                : "Register a new customer account, specify enterprise tier, and contact details."
            }
            actions={
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  resetForm();
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Customers</span>
              </button>
            }
          />

          {/* Form Main Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-8">
            <form onSubmit={handleFormSubmit} className="space-y-8 max-w-4xl mx-auto">
              {/* SECTION 1: COMPANY INFORMATION */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0D69B2] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950 text-[#0D69B2] inline-flex items-center justify-center text-xs">
                      1
                    </span>
                    <span>Company Information</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Company Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.companyName}
                      onChange={(e) =>
                        setFormValues({ ...formValues, companyName: e.target.value })
                      }
                      placeholder="Enter company name (e.g. ABC Technologies Pvt Ltd)"
                      className={`w-full px-4 py-3 rounded-xl border ${
                        formErrors.companyName
                          ? "border-rose-500 bg-rose-50/50"
                          : "border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800"
                      } text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]`}
                    />
                    {formErrors.companyName && (
                      <p className="text-xs text-rose-500 mt-1.5 font-medium">
                        {formErrors.companyName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Customer Tier <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formValues.customerTier}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          customerTier: e.target.value as CustomerTier,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                    >
                      <option value="BRONZE">Bronze Tier</option>
                      <option value="SILVER">Silver Tier</option>
                      <option value="GOLD">Gold Tier</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CONTACT INFORMATION */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0D69B2] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950 text-[#0D69B2] inline-flex items-center justify-center text-xs">
                      2
                    </span>
                    <span>Contact Information</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Contact Person <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.contactName}
                      onChange={(e) =>
                        setFormValues({ ...formValues, contactName: e.target.value })
                      }
                      placeholder="Enter contact person name"
                      className={`w-full px-4 py-3 rounded-xl border ${
                        formErrors.contactName
                          ? "border-rose-500 bg-rose-50/50"
                          : "border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800"
                      } text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]`}
                    />
                    {formErrors.contactName && (
                      <p className="text-xs text-rose-500 mt-1.5 font-medium">
                        {formErrors.contactName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formValues.email}
                      onChange={(e) =>
                        setFormValues({ ...formValues, email: e.target.value })
                      }
                      placeholder="customer@example.com"
                      className={`w-full px-4 py-3 rounded-xl border ${
                        formErrors.email
                          ? "border-rose-500 bg-rose-50/50"
                          : "border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800"
                      } text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]`}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-rose-500 mt-1.5 font-medium">
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formValues.phone}
                      onChange={(e) =>
                        setFormValues({ ...formValues, phone: e.target.value })
                      }
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ADDRESS */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0D69B2] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950 text-[#0D69B2] inline-flex items-center justify-center text-xs">
                      3
                    </span>
                    <span>Address Information</span>
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={formValues.address}
                    onChange={(e) =>
                      setFormValues({ ...formValues, address: e.target.value })
                    }
                    placeholder="Enter full address details"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={formValues.city}
                      onChange={(e) =>
                        setFormValues({ ...formValues, city: e.target.value })
                      }
                      placeholder="Enter city"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      State
                    </label>
                    <input
                      type="text"
                      value={formValues.state}
                      onChange={(e) =>
                        setFormValues({ ...formValues, state: e.target.value })
                      }
                      placeholder="Enter state"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formValues.country}
                      onChange={(e) =>
                        setFormValues({ ...formValues, country: e.target.value })
                      }
                      placeholder="India"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: ADDITIONAL INFORMATION */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#0D69B2] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950 text-[#0D69B2] inline-flex items-center justify-center text-xs">
                      4
                    </span>
                    <span>Additional Information</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Currency
                    </label>
                    <select
                      value={formValues.currency}
                      onChange={(e) =>
                        setFormValues({ ...formValues, currency: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>

                  <div className="pt-2 sm:pt-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                        Account Status
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formValues.isActive ? "Customer login and ordering active" : "Customer account deactivated"}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formValues.isActive}
                        onChange={(e) =>
                          setFormValues({ ...formValues, isActive: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#0D69B2]"></div>
                      <span className="ml-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {formValues.isActive ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* FORM BOTTOM ACTIONS */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("list");
                    resetForm();
                  }}
                  className="px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-[#0D69B2] hover:bg-[#0b5a99] text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{viewMode === "edit" ? "Saving..." : "Adding Customer..."}</span>
                    </>
                  ) : (
                    <>
                      {viewMode === "edit" ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{viewMode === "edit" ? "Save Changes" : "Add Customer"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Customer Details Modal */}
      {selectedCustomerDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-[#0D69B2]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Customer Profile
                </h3>
              </div>
              <button
                onClick={() => setSelectedCustomerDetails(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <span className="text-slate-400 text-xs block">Company Name</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {selectedCustomerDetails.companyName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-xs block">Contact Person</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedCustomerDetails.contactName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs block">Customer Tier</span>
                  {renderTierBadge(selectedCustomerDetails.customerTier)}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-xs block">Email</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedCustomerDetails.email}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-xs block">Phone</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedCustomerDetails.phone || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-xs block">Address</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {selectedCustomerDetails.address || "—"}, {selectedCustomerDetails.city || ""},{" "}
                  {selectedCustomerDetails.state || ""}, {selectedCustomerDetails.country || "India"}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCustomerDetails(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedCustomerDetails;
                  setSelectedCustomerDetails(null);
                  handleEditClick(target);
                }}
                className="px-4 py-2 bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Customer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE EMAIL CUSTOM POPUP MODAL */}
      {duplicateEmailModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border-2 border-rose-500/30 dark:border-rose-500/40 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shadow-inner">
              <AlertCircle size={36} className="animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wider">
                Duplicate Email Warning
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Ek Email Ka Do Customer Nahi Ban Sakte
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Customer with email <strong className="text-rose-600 dark:text-rose-400 underline">{duplicateEmailModal.email}</strong> is already registered in DealFlow360.
              </p>
            </div>

            {duplicateEmailModal.existingCustomer && (
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-left space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Existing Registered Customer:
                </div>
                <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                  {duplicateEmailModal.existingCustomer.companyName}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Contact: {duplicateEmailModal.existingCustomer.contactName}</span>
                  <span className="font-bold text-amber-600">Tier: {duplicateEmailModal.existingCustomer.customerTier}</span>
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/40 text-left text-xs space-y-1.5">
              <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <X size={14} className="text-rose-500" /> Validation Reason:
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-normal font-semibold">
                {duplicateEmailModal.message}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              {duplicateEmailModal.existingCustomer && (
                <button
                  type="button"
                  onClick={() => {
                    const cust = duplicateEmailModal.existingCustomer;
                    setDuplicateEmailModal(null);
                    setViewMode("list");
                    if (cust) setSelectedCustomerDetails(cust);
                  }}
                  className="w-full sm:w-1/2 py-2.5 px-4 text-xs font-extrabold text-white rounded-xl bg-[#0D69B2] hover:bg-[#0b5a99] shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Eye size={15} />
                  <span>View Profile</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setDuplicateEmailModal(null)}
                className={`w-full ${
                  duplicateEmailModal.existingCustomer ? "sm:w-1/2" : "w-full"
                } py-2.5 px-4 text-xs font-extrabold text-slate-700 dark:text-slate-200 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer`}
              >
                Change Email
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
