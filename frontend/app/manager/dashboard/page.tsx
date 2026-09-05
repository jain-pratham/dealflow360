"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function ManagerDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="font-bold text-white tracking-tight flex items-center gap-2">
                Sales Manager Dashboard
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  SALES_MANAGER
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Logged in as {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout().then(() => router.push("/login"))}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h2 className="text-xl font-bold text-white mb-2">Discount Over-Threshold Approvals</h2>
          <p className="text-slate-400 text-sm">Review team quotations requiring managerial discount overrides.</p>
        </div>
      </main>
    </div>
  );
}
