"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/DataTable";
import { GitCommit, Loader2 } from "lucide-react";

interface ApprovalChainRecord {
  id: string;
  name: string;
  description?: string | null;
  requiredRole: "SALES_MANAGER" | "FINANCE";
  sequence: number;
  isActive: boolean;
}

export default function ManagerApprovalChainsPage() {
  const [chains, setChains] = useState<ApprovalChainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChains = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<ApprovalChainRecord[]>("/approval-chains");
        if (res.error) {
          setError(res.error);
        } else {
          setChains(res.data || []);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load approval chains.");
      } finally {
        setLoading(false);
      }
    };
    fetchChains();
  }, []);

  return (
    <AppLayout>
      <PageHeader
        badgeText="Approval Matrix"
        title="Manager Approval Chains"
        description="View sequential approval levels configured for commercial proposals."
      />
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Escalation Hierarchy</h3>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-blue-500" />
            <span>Loading approval hierarchy...</span>
          </div>
        ) : chains.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No approval chains configured.
          </div>
        ) : (
          <div className="space-y-3">
            {chains.map((chain) => (
              <div
                key={chain.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-xs shrink-0 mt-0.5">
                    #{chain.sequence}
                  </span>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {chain.name}
                    </div>
                    {chain.description && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {chain.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      chain.requiredRole === "FINANCE"
                        ? "bg-pink-500/10 text-pink-600 dark:text-pink-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {chain.requiredRole}
                  </span>
                  <StatusBadge
                    type={chain.isActive ? "success" : "warning"}
                    label={chain.isActive ? "Active" : "Inactive"}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
