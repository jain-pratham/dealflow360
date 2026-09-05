"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [adminTestResult, setAdminTestResult] = useState<string | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState(false);

  const testAdminApi = async () => {
    setTestingEndpoint(true);
    setAdminTestResult(null);
    const res = await apiClient.get("/admin/test");
    if (res.status === 200) {
      setAdminTestResult(`✅ HTTP 200 OK: ${JSON.stringify(res.data)}`);
    } else {
      setAdminTestResult(`❌ HTTP ${res.status}: ${res.error || "Forbidden"}`);
    }
    setTestingEndpoint(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="font-bold text-white tracking-tight flex items-center gap-2">
                System Administration & Governance
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  ADMIN
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Logged in as {user?.email || "admin@dealflow360.com"}
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        <div className="p-6 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">RBAC Authorization Test</h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify backend `@Roles(UserRole.ADMIN)` guard enforcement on `/api/admin/test`
            </p>
          </div>
          <button
            onClick={testAdminApi}
            disabled={testingEndpoint}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg"
          >
            {testingEndpoint ? "Testing..." : "Test Admin-Only API Endpoint"}
          </button>
        </div>

        {adminTestResult && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
            {adminTestResult}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Total System Users</div>
            <div className="text-3xl font-extrabold text-white mt-2">5</div>
            <div className="text-xs text-slate-500 mt-1">Seeded & Registered</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Product Catalog</div>
            <div className="text-3xl font-extrabold text-white mt-2">4</div>
            <div className="text-xs text-slate-500 mt-1">Products Configured</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Discount Tiers</div>
            <div className="text-3xl font-extrabold text-white mt-2">5</div>
            <div className="text-xs text-slate-500 mt-1">Governance Rules Active</div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Warehouses</div>
            <div className="text-3xl font-extrabold text-white mt-2">2</div>
            <div className="text-xs text-slate-500 mt-1">Fulfillment Centers</div>
          </div>
        </div>
      </main>
    </div>
  );
}
