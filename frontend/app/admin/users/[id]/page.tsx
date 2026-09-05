"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/DataTable";
import {
  ArrowLeft,
  Edit2,
  Power,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  FileText,
  ChevronRight,
  Building2,
  MapPin,
  Phone,
  Globe,
  Calendar,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { UserRole, TeamUser } from "../page";

export interface DetailedUser extends TeamUser {
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  customer?: {
    id: string;
    name: string;
    companyName: string;
    contactEmail: string;
    tier: string;
  } | null;
  quotationsCreated?: {
    id: string;
    quoteNumber: string;
    status: string;
    totalAmount: number | string;
    createdAt: string;
  }[];
  approvalsHandled?: {
    id: string;
    status: string;
    requestedRole: string;
    createdAt: string;
  }[];
  auditLogs?: {
    id: string;
    action: string;
    createdAt: string;
  }[];
  _count?: {
    quotationsCreated: number;
    approvalsHandled: number;
    auditLogs: number;
    commentsWritten: number;
  };
}

export default function UserDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [user, setUser] = useState<DetailedUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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

  const fetchUser = async () => {
    if (!userId) return;
    setLoading(true);
    const res = await apiClient.get<DetailedUser>(`/users/${userId}`);
    if (res.data) {
      setUser(res.data);
    } else {
      showToast("error", res.error || "Failed to load user details.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
    if (searchParams?.get("updated") === "true") {
      showToast("success", "User profile updated and saved successfully!");
    }
  }, [userId, searchParams]);

  const handleToggleStatus = async () => {
    if (!user) return;
    const newStatus = !user.isActive;
    const res = await apiClient.patch<DetailedUser>(`/users/${user.id}/status`, {
      isActive: newStatus,
    });

    if (res.data) {
      setUser({ ...user, isActive: newStatus });
      showToast(
        "success",
        `User ${user.name} account is now ${newStatus ? "Active" : "Inactive"}.`
      );
    } else {
      showToast("error", res.error || "Failed to change user status.");
    }
  };

  const initials = user?.name
    ? user.name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";

  return (
    <AppLayout>
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

      {/* Navigation Breadcrumb Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs"
          >
            <ArrowLeft size={16} className="text-[#0D69B2]" />
            <span>Back to Team & Roles</span>
          </Link>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span>Admin</span>
            <ChevronRight size={12} />
            <span>Users</span>
            <ChevronRight size={12} />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              User Detail View
            </span>
          </div>
        </div>

        {/* Action Header Controls */}
        {user && (
          <div className="flex items-center gap-2.5">
            <Link
              href={`/admin/users/${user.id}/edit`}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-[#0D69B2] hover:bg-[#0b5997] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all cursor-pointer"
            >
              <Edit2 size={16} />
              <span>Edit Member Profile</span>
            </Link>

            <button
              onClick={handleToggleStatus}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold border transition-all cursor-pointer ${
                user.isActive
                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50"
              }`}
            >
              <Power size={16} />
              <span>{user.isActive ? "Deactivate User" : "Activate User"}</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-[#0D69B2] mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">
            Loading team member record...
          </p>
        </div>
      ) : !user ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
            User Record Not Found
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">
            The requested team member does not exist or was removed.
          </p>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D69B2] text-white text-xs font-bold"
          >
            Return to Users List
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Member Hero Summary Box Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#0D69B2] text-white flex items-center justify-center text-2xl font-black shadow-md border-2 border-white/20 shrink-0">
                  {initials}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">
                      {user.name}
                    </h1>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-[#0D69B2] dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {user.role}
                    </span>

                    <StatusBadge
                      type={user.isActive ? "success" : "danger"}
                      label={user.isActive ? "Active Account" : "Disabled"}
                    />
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Mail size={14} className="text-slate-400" />
                    <span>{user.email}</span>
                  </p>
                </div>
              </div>

              {/* KPI Summary Cards Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6 shrink-0">
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Quotations
                  </span>
                  <span className="text-base font-black text-[#0D69B2] dark:text-blue-400">
                    {user._count?.quotationsCreated ?? user.quotationsCreated?.length ?? 0} Drafted
                  </span>
                </div>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Approvals
                  </span>
                  <span className="text-base font-black text-purple-600 dark:text-purple-400">
                    {user._count?.approvalsHandled ?? user.approvalsHandled?.length ?? 0} Reviewed
                  </span>
                </div>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Audit Logs
                  </span>
                  <span className="text-base font-black text-slate-700 dark:text-slate-300">
                    {user._count?.auditLogs ?? user.auditLogs?.length ?? 0} Actions
                  </span>
                </div>
                <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Verification
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      user.isVerified
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {user.isVerified ? "Verified Email" : "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TOP SECTION: 2-COLUMN GRID (Account Profile Left, BADA Quotations Box Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* LEFT COLUMN: Account Profile Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-[#0D69B2] rounded-lg">
                    <User size={18} />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Account Profile
                  </h3>
                </div>

                <div className="space-y-3.5 text-xs sm:text-sm">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Full Name
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {user.name}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Email Address
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {user.email}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      System User ID
                    </span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl block border border-slate-200 dark:border-slate-700/60 font-bold">
                      {user.id}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Account Status
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-extrabold text-xs ${
                        user.isActive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          user.isActive ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {user.isActive ? "Active & Authorized" : "Disabled / Inactive"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      Created Timestamp
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {new Date(user.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {user.updatedAt && (
                    <div>
                      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Last Profile Update
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {new Date(user.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Linked Customer Profile if present */}
                  {user.customer && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Linked Customer Account
                      </span>
                      <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-slate-800/80 border border-blue-100 dark:border-slate-700 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                          <Building2 size={14} className="text-[#0D69B2]" />
                          <span>{user.customer.companyName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {user.customer.contactEmail} • Tier:{" "}
                          <span className="font-bold text-[#0D69B2]">
                            {user.customer.tier}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: EXPANDED / BADA QUOTATIONS GENERATED BOX (lg:col-span-2) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-[#0D69B2] rounded-xl">
                      <FileText size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Quotations & Proposals Generated</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 dark:bg-blue-900/40 text-[#0D69B2]">
                          {user.quotationsCreated?.length || 0}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Sales proposals, commercial quotes, and deals authored by {user.name}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/sales/quotations"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0D69B2] dark:text-blue-300 text-xs font-extrabold hover:bg-blue-100 transition-all"
                  >
                    <span>View All Sales Quotes</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>

                {user.quotationsCreated && user.quotationsCreated.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {user.quotationsCreated.map((q) => (
                      <div
                        key={q.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-3 rounded-xl transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white font-mono">
                              {q.quoteNumber}
                            </span>
                            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {q.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar size={13} className="text-slate-400" />
                            <span>Authored on {new Date(q.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                          <div className="text-left sm:text-right">
                            <span className="text-xs uppercase font-bold text-slate-400 block">
                              Total Amount
                            </span>
                            <span className="font-black text-base text-[#0D69B2] dark:text-blue-400">
                              ₹{Number(q.totalAmount).toLocaleString()}
                            </span>
                          </div>

                          <Link
                            href={`/portal/quotations/${q.id}`}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-[#0D69B2] hover:text-white transition-all shadow-2xs shrink-0"
                          >
                            View Proposal →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                    <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                      No Quotations Authored Yet
                    </h4>
                    <p className="text-xs font-medium text-slate-400 max-w-sm mx-auto">
                      Sales proposals drafted by this team member will be logged and listed here automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* BOTTOM SECTION: FULL WIDTH CONTACT & ADDRESS CARD (NICHE POSITIONED & INCREASED WEIGHT) */}
          <div className="w-full">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      Contact & Address Details
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Verified phone contact and official street address location
                    </p>
                  </div>
                </div>

                <Link
                  href={`/admin/users/${user.id}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D69B2] hover:bg-[#0b5997] text-white text-xs font-extrabold shadow-sm transition-all"
                >
                  <Edit2 size={14} />
                  <span>Edit Contact & Address (Full Page)</span>
                </Link>
              </div>

              {/* Increased Weight & Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Mobile / Phone Number */}
                <div className="md:col-span-1 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                  <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Mobile / Contact Phone
                  </span>
                  <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    <Phone size={16} className="text-emerald-500 shrink-0" />
                    <span>{user.phone ? user.phone : "Not provided"}</span>
                  </div>
                </div>

                {/* Street Address */}
                <div className="md:col-span-2 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
                  <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    Street Address
                  </span>
                  <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-relaxed">
                    {user.address ? user.address : "Not provided"}
                  </div>
                </div>

                {/* City, State, Country, Zip Code Row */}
                <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                    <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      City
                    </span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 block">
                      {user.city ? user.city : "-"}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                    <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      State / Province
                    </span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 block">
                      {user.state ? user.state : "-"}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                    <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Country
                    </span>
                    <div className="flex items-center gap-1.5 font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      <Globe size={15} className="text-blue-500 shrink-0" />
                      <span>{user.country ? user.country : "India"}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                    <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Postal / ZIP Code
                    </span>
                    <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100 block">
                      {user.postalCode ? user.postalCode : "-"}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      )}
    </AppLayout>
  );
}
