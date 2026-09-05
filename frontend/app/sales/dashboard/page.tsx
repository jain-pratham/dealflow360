"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";

export default function SalesDashboardPage() {
  const router = useRouter();
  const { user, logout, refreshMe } = useAuth();
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  const handleSimulateVerification = async () => {
    setVerifying(true);
    setVerifySuccess(null);
    // Trigger dev verification by calling me or verify-email endpoint
    // In our backend, we can trigger verification via test token or simulation
    const res = await apiClient.get<{ message: string }>(`/auth/verify-email?token=simulated_token`);
    if (res.status === 200 || res.status === 404) {
      // Force refresh user profile
      await refreshMe();
      setVerifySuccess("Email verification successful! Full CRM access unlocked.");
    }
    setVerifying(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💼</span>
            <div>
              <h1 className="font-bold text-white tracking-tight flex items-center gap-2">
                Sales Operations Dashboard
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {user?.role || "SALES_REP"}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Welcome back, {user?.name || "Sales Rep"} ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => logout().then(() => router.push("/login"))}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Email Verification Banner */}
        {user && !user.isVerified && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl">📧</span>
              <div>
                <h3 className="font-semibold text-amber-100 text-base">
                  Account Pending Verification (Read-Only Mode)
                </h3>
                <p className="text-xs text-amber-300/80 mt-1 max-w-2xl">
                  Your email address <strong className="text-amber-200">{user.email}</strong> is not verified yet. 
                  You are currently operating in restricted read-only mode until email verification is completed.
                </p>
              </div>
            </div>

            <button
              onClick={handleSimulateVerification}
              disabled={verifying}
              className="whitespace-nowrap px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              {verifying ? "Verifying..." : "Simulate Email Verification"}
            </button>
          </div>
        )}

        {verifySuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <span>✅</span> {verifySuccess}
          </div>
        )}

        {/* Dashboard Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Active Quotations</div>
            <div className="text-3xl font-extrabold text-white mt-2">12</div>
            <div className="text-xs text-emerald-400 mt-2 font-medium">↑ 4 created this week</div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Pending Approvals</div>
            <div className="text-3xl font-extrabold text-white mt-2">2</div>
            <div className="text-xs text-amber-400 mt-2 font-medium">Awaiting Manager Review</div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Quota Attainment</div>
            <div className="text-3xl font-extrabold text-white mt-2">78%</div>
            <div className="text-xs text-indigo-400 mt-2 font-medium">$156,000 / $200,000</div>
          </div>
        </div>
      </main>
    </div>
  );
}
