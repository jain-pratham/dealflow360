"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { getRoleDisplayName } from "@/lib/role-utils";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  KeyRound,
} from "lucide-react";

interface UserProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export default function UserProfileView() {
  const { user, refreshMe } = useAuth();

  // Profile Details Form State
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
  });

  // Password Security Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [initialProfileData, setInitialProfileData] = useState<typeof profileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Per-field inline error states
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // Global Notification Banners
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch logged in user profile details from /api/auth/me
  const fetchProfile = async () => {
    setLoading(true);
    setProfileError(null);
    try {
      const res = await apiClient.get<UserProfileData>("/auth/me");
      if (res.data) {
        const loaded = {
          name: res.data.name || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          address: res.data.address || "",
          city: res.data.city || "",
          state: res.data.state || "",
          country: res.data.country || "India",
          postalCode: res.data.postalCode || "",
        };
        setProfileData(loaded);
        setInitialProfileData(loaded);
      } else if (res.error) {
        setProfileError(res.error);
      }
    } catch (err: any) {
      setProfileError(err.message || "Failed to load user profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
    if (profileErrors[name]) {
      setProfileErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setProfileSuccess(null);
    setProfileError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setPasswordSuccess(null);
    setPasswordError(null);
  };

  const handleResetProfile = () => {
    if (initialProfileData) {
      setProfileData(initialProfileData);
      setProfileErrors({});
      setProfileSuccess(null);
      setProfileError(null);
    }
  };

  // Custom Field Validation for Profile Details
  const validateProfileForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!profileData.name.trim()) {
      errors.name = "Full name is required";
    } else if (profileData.name.trim().length < 2) {
      errors.name = "Full name must be at least 2 characters long";
    }

    if (profileData.phone && profileData.phone.trim()) {
      const cleanedPhone = profileData.phone.trim().replace(/[\s\-\(\)]/g, "");
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(cleanedPhone)) {
        errors.phone = "Enter a valid phone number (10 to 15 digits)";
      }
    }

    if (profileData.postalCode && profileData.postalCode.trim()) {
      const pinRegex = /^[0-9]{6}$/;
      if (!pinRegex.test(profileData.postalCode.trim())) {
        errors.postalCode = "Enter a valid 6-digit PIN code";
      }
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Custom Field Validation for Password Update
  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = "New password must be at least 6 characters long";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Confirm password does not match new password";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Smooth scroll helper to focus on the first input with a validation error
  const scrollToFirstError = (formEl?: HTMLElement | null) => {
    setTimeout(() => {
      const errorField = formEl
        ? formEl.querySelector(".border-red-500, input.border-red-500, select.border-red-500")
        : document.querySelector(".border-red-500, input.border-red-500, select.border-red-500");

      if (errorField) {
        errorField.scrollIntoView({ behavior: "smooth", block: "center" });
        errorField.classList.add("animate-error-glow");
        setTimeout(() => errorField.classList.remove("animate-error-glow"), 800);
        if (errorField instanceof HTMLInputElement || errorField instanceof HTMLSelectElement) {
          errorField.focus({ preventScroll: true });
        }
      }
    }, 50);
  };

  // Submit Handler for Personal & Location Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    if (!validateProfileForm()) {
      setProfileError("Please correct the validation errors in the form below.");
      scrollToFirstError(e.currentTarget as HTMLElement);
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        country: profileData.country,
        postalCode: profileData.postalCode,
      };

      const res = await apiClient.patch("/auth/profile", payload);

      if (res.error) {
        setProfileError(res.error);
        scrollToFirstError(e.currentTarget as HTMLElement);
      } else {
        setProfileSuccess("Personal profile details updated successfully!");
        setInitialProfileData(profileData);
        setProfileErrors({});
        if (refreshMe) {
          await refreshMe();
        }
      }
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile details.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Submit Handler for Security & Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!validatePasswordForm()) {
      setPasswordError("Please correct the password validation errors below.");
      scrollToFirstError(e.currentTarget as HTMLElement);
      return;
    }

    setSavingPassword(true);
    try {
      const payload = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      };

      const res = await apiClient.patch("/auth/profile", payload);

      if (res.error) {
        setPasswordError(res.error);
        scrollToFirstError(e.currentTarget as HTMLElement);
      } else {
        setPasswordSuccess("Password updated successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setPasswordErrors({});
      }
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const roleTitle = getRoleDisplayName(user?.role);

  return (
    <AppLayout>
      <PageHeader
        badgeText="Account Governance"
        title="User Profile & Account Settings"
        description="Manage your identity details, contact information, address details, and security credentials."
      />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Loading State */}
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-[#0D69B2]" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Loading profile details...
            </p>
          </div>
        ) : (
          <>
            {/* BLOCK 1: PERSONAL & LOCATION PROFILE DETAILS */}
            <form
              noValidate
              onSubmit={handleSaveProfile}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6"
            >
              {/* SECTION HEADER WITH NUMBERED BADGE */}
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-7 h-7 rounded-full bg-[#0D69B2] text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
                  1
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Basic Information & Contact Details
                </h3>
              </div>

              {/* Profile Alert Messages */}
              {profileSuccess && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold animate-in fade-in">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-600 dark:text-red-400 text-sm font-semibold animate-in fade-in">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Personal Information — 3 Column Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    placeholder="Enter full name"
                    className={`w-full bg-white dark:bg-slate-800/80 border ${
                      profileErrors.name
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-[#0D69B2] focus:ring-[#0D69B2]/15"
                    } rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 shadow-2xs`}
                  />
                  {profileErrors.name && (
                    <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{profileErrors.name}</span>
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                {/* Phone Number with Prefix */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <div className={`flex items-center rounded-xl border ${
                    profileErrors.phone
                      ? "border-red-500 focus-within:ring-red-500/20"
                      : "border-slate-200 dark:border-slate-700 focus-within:border-[#0D69B2] focus-within:ring-[#0D69B2]/15"
                  } bg-white dark:bg-slate-800/80 overflow-hidden shadow-2xs focus-within:ring-2 transition-all`}>
                    <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-600 dark:text-slate-400 shrink-0 select-none">
                      IN +91
                    </span>
                    <input
                      type="text"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      placeholder="Enter phone number"
                      className="w-full bg-transparent px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  {profileErrors.phone && (
                    <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{profileErrors.phone}</span>
                    </p>
                  )}
                </div>

                {/* Assigned Role Badge */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Assigned System Role
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-[#0D69B2] cursor-not-allowed"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={profileData.country}
                    onChange={handleProfileChange}
                    placeholder="India"
                    className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-[#0D69B2] focus:ring-2 focus:ring-[#0D69B2]/15 shadow-2xs"
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Postal / PIN Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={profileData.postalCode}
                    onChange={handleProfileChange}
                    placeholder="400001"
                    className={`w-full bg-white dark:bg-slate-800/80 border ${
                      profileErrors.postalCode
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-[#0D69B2] focus:ring-[#0D69B2]/15"
                    } rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 shadow-2xs`}
                  />
                  {profileErrors.postalCode && (
                    <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{profileErrors.postalCode}</span>
                    </p>
                  )}
                </div>

                {/* Street Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={profileData.address}
                    onChange={handleProfileChange}
                    placeholder="Enter street or office address"
                    className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-[#0D69B2] focus:ring-2 focus:ring-[#0D69B2]/15 shadow-2xs"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={profileData.city}
                    onChange={handleProfileChange}
                    placeholder="e.g. Mumbai, Delhi"
                    className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-[#0D69B2] focus:ring-2 focus:ring-[#0D69B2]/15 shadow-2xs"
                  />
                </div>
              </div>

              {/* Action Buttons for Personal & Location Profile Details */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleResetProfile}
                  disabled={savingProfile}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  <span>Reset Details</span>
                </button>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-xl bg-[#0D69B2] hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving Profile Details...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Profile Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* BLOCK 2: SECURITY & PASSWORD MANAGEMENT */}
            <form
              noValidate
              onSubmit={handleUpdatePassword}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6"
            >
              {/* SECTION HEADER WITH NUMBERED BADGE */}
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-7 h-7 rounded-full bg-[#F4882E] text-white flex items-center justify-center font-extrabold text-xs shadow-xs shrink-0">
                  2
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Security & Password Credentials
                </h3>
              </div>

              {/* Password Alert Messages */}
              {passwordSuccess && (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400 text-sm font-semibold animate-in fade-in">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-600 dark:text-red-400 text-sm font-semibold animate-in fade-in">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    className={`w-full bg-white dark:bg-slate-800/80 border ${
                      passwordErrors.currentPassword
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-[#F4882E] focus:ring-[#F4882E]/15"
                    } rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 shadow-2xs`}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{passwordErrors.currentPassword}</span>
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    className={`w-full bg-white dark:bg-slate-800/80 border ${
                      passwordErrors.newPassword
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-[#F4882E] focus:ring-[#F4882E]/15"
                    } rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 shadow-2xs`}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{passwordErrors.newPassword}</span>
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="••••••••"
                    className={`w-full bg-white dark:bg-slate-800/80 border ${
                      passwordErrors.confirmPassword
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-[#F4882E] focus:ring-[#F4882E]/15"
                    } rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 shadow-2xs`}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{passwordErrors.confirmPassword}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button for Security & Password Update */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                    setPasswordErrors({});
                  }}
                  disabled={savingPassword}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                  <span>Clear Password Fields</span>
                </button>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 rounded-xl bg-[#F4882E] hover:bg-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={15} />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </AppLayout>
  );
}
