"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import {
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building,
  ShieldCheck,
  Power,
  Key,
  Save,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { UserRole, TeamUser } from "../../page";

const ROLES_LIST: UserRole[] = [
  "ADMIN",
  "SALES_REP",
  "SALES_MANAGER",
  "FINANCE",
];

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    isVerified: boolean;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }>({
    name: "",
    email: "",
    role: "SALES_REP",
    isActive: true,
    isVerified: false,
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
  });

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const fetchUser = async () => {
    if (!userId) return;
    setLoading(true);
    const res = await apiClient.get<TeamUser>(`/users/${userId}`);
    if (res.data) {
      const u = res.data;
      setEditForm({
        name: u.name || "",
        email: u.email || "",
        role: u.role || "SALES_REP",
        isActive: u.isActive ?? true,
        isVerified: u.isVerified ?? false,
        phone: u.phone || "",
        address: u.address || "",
        city: u.city || "",
        state: u.state || "",
        country: u.country || "India",
        postalCode: u.postalCode || "",
      });
    } else {
      showToast("error", res.error || "Failed to load member profile details.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSubmitting(true);
    const res = await apiClient.patch<TeamUser>(`/users/${userId}`, {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
      isActive: editForm.isActive,
      isVerified: editForm.isVerified,
      phone: editForm.phone.trim(),
      address: editForm.address.trim(),
      city: editForm.city.trim(),
      state: editForm.state.trim(),
      country: editForm.country.trim(),
      postalCode: editForm.postalCode.trim(),
    });

    if (res.data) {
      showToast("success", "Member details saved successfully!");
      setTimeout(() => {
        router.push(`/admin/users/${userId}?updated=true`);
      }, 600);
    } else {
      showToast("error", res.error || "Failed to update member profile.");
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        badgeText="Governance & Administration"
        title="Edit Team Member Profile"
        description="Update user identity details, contact information, postal address, and enterprise system roles."
      />

      {/* Toast Notification */}
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

      {/* Centered Main Container */}
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/admin/users/${userId}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs"
            >
              <ArrowLeft size={16} className="text-[#0D69B2]" />
              <span>Back to User View</span>
            </Link>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
              <span>Admin</span>
              <ChevronRight size={12} />
              <span>Users</span>
              <ChevronRight size={12} />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Edit User
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-[#0D69B2] mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">
              Loading user profile editor...
            </p>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="space-y-6">
          {/* Main 2-Column Responsive Form Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARD 1: PERSONAL & ACCOUNT PROFILE */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-full bg-[#0D69B2] text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Identity & Account Profile
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      required
                      placeholder="e.g. John Doe"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                      required
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Assigned Enterprise Role
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                    <select
                      value={editForm.role}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          role: e.target.value as UserRole,
                        })
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm font-bold text-[#0D69B2] dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] cursor-pointer transition-all"
                    >
                      {ROLES_LIST.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: CONTACT INFORMATION */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
                  <Phone size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Contact Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mobile numbers and primary communication channel
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Mobile / Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used for SMS alerts and official contact directory.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 3: POSTAL ADDRESS & LOCATION (FULL WIDTH SPAN) */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-full bg-[#0D69B2] text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Postal Address & Location Details
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Street Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm({ ...editForm, address: e.target.value })
                      }
                      placeholder="e.g. 101 Innovation Park, MG Road"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Country
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) =>
                        setEditForm({ ...editForm, country: e.target.value })
                      }
                      placeholder="e.g. India"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    City
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm({ ...editForm, city: e.target.value })
                      }
                      placeholder="e.g. Mumbai"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) =>
                      setEditForm({ ...editForm, state: e.target.value })
                    }
                    placeholder="e.g. Maharashtra"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Postal / ZIP Code
                  </label>
                  <input
                    type="text"
                    value={editForm.postalCode}
                    onChange={(e) =>
                      setEditForm({ ...editForm, postalCode: e.target.value })
                    }
                    placeholder="e.g. 400001"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* CARD 4: ACCOUNT GOVERNANCE & STATUS (FULL WIDTH SPAN) */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-lg">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Account Status & Verification Switches
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage system login permission and email confirmation flags
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                      Account Access Status
                    </span>
                    <span className="text-xs text-slate-500">
                      {editForm.isActive
                        ? "Active - User can log in and access modules"
                        : "Inactive - Login access blocked"}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) =>
                        setEditForm({ ...editForm, isActive: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#0D69B2]"></div>
                  </label>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                      Email Verification Status
                    </span>
                    <span className="text-xs text-slate-500">
                      {editForm.isVerified
                        ? "Verified - Email address is confirmed"
                        : "Unverified - Pending verification"}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isVerified}
                      onChange={(e) =>
                        setEditForm({ ...editForm, isVerified: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* ACTION BUTTONS BAR */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <Link
              href={`/admin/users/${userId}`}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs sm:text-sm transition-all"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#0D69B2] hover:bg-[#0b5997] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
      </div>
    </AppLayout>
  );
}
