"use client";

import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { apiClient } from "@/lib/api-client";
import { DealHealthScoreBadge } from "@/components/deal-health/DealHealthScoreBadge";
import { DealHealthDetailView } from "@/components/deal-health/DealHealthDetailView";
import {
  HeartPulse,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Activity,
  BarChart3,
  Filter,
  Shield,
  Zap,
} from "lucide-react";

interface Alert {
  id: string;
  alertType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  message: string;
  isResolved: boolean;
  createdAt: string;
  quotation?: {
    quoteNumber: string;
    customer: { companyName: string };
  };
}

interface DashboardMetrics {
  totalDeals: number;
  healthyDeals: number;
  atRiskDeals: number;
  criticalDeals: number;
  openAlerts: number;
  criticalAlerts: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
}

interface QuotationHealth {
  quotationId: string;
  score: number;
  status: string;
  alerts: any[];
}

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const severityBadge = (s: string) => {
  if (s === "CRITICAL") return "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
  if (s === "HIGH") return "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400";
  if (s === "MEDIUM") return "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400";
  return "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400";
};

export default function AdminDealHealthPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<QuotationHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        apiClient.get<DashboardMetrics>("/deal-health/dashboard"),
        apiClient.get<Alert[]>("/deal-health/alerts"),
      ]);
      if (metricsRes.data) setMetrics(metricsRes.data);
      if (alertsRes.data) setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
    } catch {
      setError("Failed to load deal health data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadDetail = async (quotationId: string) => {
    setSelectedId(quotationId);
    const res = await apiClient.get<QuotationHealth>(`/deal-health/quotation/${quotationId}`);
    if (res.data) setSelectedHealth(res.data);
  };

  const handleRecalculate = async (quotationId: string) => {
    setRecalculating(quotationId);
    await apiClient.post(`/deal-health/quotation/${quotationId}/recalculate`);
    setRecalculating(null);
    fetchData();
    if (selectedId === quotationId) loadDetail(quotationId);
  };

  const filtered = alerts
    .filter((a) => severityFilter === "ALL" || a.severity === severityFilter)
    .filter((a) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.quotation?.quoteNumber.toLowerCase().includes(q) ||
        a.quotation?.customer.companyName.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const healthScore = metrics
    ? metrics.totalDeals > 0
      ? Math.round((metrics.healthyDeals / metrics.totalDeals) * 100)
      : 100
    : null;

  return (
    <AppLayout>
      <PageHeader
        badgeText="System Intelligence"
        title="Deal Health — Admin Overview"
        description="Full-system deal health visibility across all sales reps, customers and stages."
      />

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Activity size={32} className="animate-pulse" />
            <p className="text-sm">Analyzing all deals...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">{error}</div>
      )}

      {!loading && !error && metrics && (
        <div className="space-y-6">
          {/* Hero row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Portfolio health score */}
            <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg col-span-1">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-16 translate-x-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-10 -translate-x-10" />
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="opacity-80" />
                <span className="text-sm font-semibold opacity-80">Portfolio Health</span>
              </div>
              <div className="text-6xl font-black mb-1">{healthScore}%</div>
              <p className="text-sm opacity-70">{metrics.healthyDeals} of {metrics.totalDeals} deals healthy</p>
              <div className="mt-4 h-2 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${healthScore}%` }}
                />
              </div>
            </div>

            {/* Stat grid */}
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Deals", value: metrics.totalDeals, icon: BarChart3, color: "text-indigo-500 bg-indigo-500/10" },
                { label: "Healthy", value: metrics.healthyDeals, icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
                { label: "At Risk", value: metrics.atRiskDeals, icon: TrendingDown, color: "text-amber-500 bg-amber-500/10" },
                { label: "Critical", value: metrics.criticalDeals, icon: AlertTriangle, color: "text-red-500 bg-red-500/10" },
              ].map((s) => (
                <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                  <div className={`inline-flex p-2 rounded-xl mb-3 ${s.color}`}>
                    <s.icon size={15} />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert type + severity charts */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <Zap size={14} className="text-amber-500" /> Alerts by Type
              </h3>
              <div className="space-y-2">
                {Object.entries(metrics.alertsByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const max = Math.max(...Object.values(metrics.alertsByType));
                    const pct = max > 0 ? (count / max) * 100 : 0;
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <div className="text-xs text-slate-500 w-40 shrink-0 font-medium truncate">{type.replace(/_/g, " ")}</div>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white w-5 text-right">{count}</div>
                      </div>
                    );
                  })}
                {Object.keys(metrics.alertsByType).length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No active alerts.</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <Shield size={14} className="text-red-500" /> Alerts by Severity
              </h3>
              <div className="space-y-3">
                {[
                  { key: "CRITICAL", color: "bg-red-500", label: "Critical" },
                  { key: "HIGH", color: "bg-orange-500", label: "High" },
                  { key: "MEDIUM", color: "bg-amber-400", label: "Medium" },
                  { key: "LOW", color: "bg-blue-400", label: "Low" },
                ].map(({ key, color, label }) => {
                  const count = metrics.alertsBySeverity[key] || 0;
                  const total = metrics.openAlerts || 1;
                  const pct = (count / total) * 100;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="text-xs text-slate-500 w-16 shrink-0 font-medium">{label}</div>
                      <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white w-5 text-right">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Alert list + detail */}
          <div className="grid xl:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">All Active Alerts</h3>
                    {alerts.length > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white">{alerts.length}</span>
                    )}
                  </div>
                  <button onClick={fetchData} className="text-slate-400 hover:text-indigo-500 transition-colors p-1">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Search size={13} className="text-slate-400 shrink-0" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by quote, customer or alert..."
                      className="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Filter size={13} className="text-slate-400 shrink-0" />
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none"
                    >
                      <option value="ALL">All</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px]">
                {filtered.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto mb-3 opacity-40 text-emerald-500" />
                    <p className="text-sm font-medium">No alerts match your filters.</p>
                  </div>
                ) : (
                  filtered.map((alert) => (
                    <button
                      key={alert.id}
                      className="w-full text-left flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <span className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${severityBadge(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{alert.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alert.message}</div>
                        {alert.quotation && (
                          <div className="text-[10px] text-indigo-500 font-semibold mt-1.5 flex items-center gap-1">
                            <HeartPulse size={10} />
                            {alert.quotation.quoteNumber} · {alert.quotation.customer.companyName}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Deal health detail */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <HeartPulse size={16} className="text-indigo-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedHealth ? "Health Breakdown" : "Select a Deal"}
                  </h3>
                </div>
                {selectedHealth && selectedId && (
                  <button
                    onClick={() => handleRecalculate(selectedId)}
                    disabled={recalculating === selectedId}
                    className="text-xs font-semibold px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={recalculating === selectedId ? "animate-spin" : ""} />
                    Recalculate
                  </button>
                )}
              </div>
              <div className="p-5">
                {!selectedHealth ? (
                  <div className="py-16 text-center text-slate-400">
                    <Activity size={36} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-medium text-slate-500">
                      Select a quotation from the alert list to view detailed health analysis.
                    </p>
                  </div>
                ) : (
                  <DealHealthDetailView
                    data={selectedHealth}
                    onResolve={() => {
                      fetchData();
                      if (selectedId) loadDetail(selectedId);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
