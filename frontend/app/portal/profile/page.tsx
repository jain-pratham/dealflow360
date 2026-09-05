"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Building2, User, Mail, Phone, MapPin, CreditCard, Shield, Loader2 } from "lucide-react";

interface CustomerProfile {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  currency: string;
  createdAt: string;
}

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<CustomerProfile>("/customer-portal/profile");
        if (res.error) {
          setError(res.error);
        } else {
          setProfile(res.data || null);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load customer profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-400">Loading your profile...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        badgeText="Customer Portal"
        title="My Account & Profile"
        description="View your registered account details and contact information."
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {profile && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center space-x-4 border-b border-slate-200 dark:border-slate-800 pb-6">
              <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center font-bold text-xl">
                {profile.companyName ? profile.companyName.charAt(0).toUpperCase() : "C"}
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {profile.companyName}
                </h3>
                <p className="text-xs text-slate-400 font-medium">Customer Account</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <User size={14} className="text-blue-500" />
                  <span>Contact Person</span>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {profile.contactName || "N/A"}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <Mail size={14} className="text-blue-500" />
                  <span>Email Address</span>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {profile.email}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <Phone size={14} className="text-blue-500" />
                  <span>Phone Number</span>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {profile.phone || "Not provided"}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <CreditCard size={14} className="text-blue-500" />
                  <span>Billing Currency</span>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {profile.currency || "USD"}
                </p>
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <MapPin size={14} className="text-blue-500" />
                  <span>Primary Address</span>
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {profile.address || "No address specified"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
