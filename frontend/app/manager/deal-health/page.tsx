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
  Filter,
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

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export default function ManagerDealHealthPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<QuotationHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
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

  const filteredAlerts = alerts
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
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const severityColor = (s: string) => {
    if (s === "CRITICAL") return "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
    if (s === "HIGH") return "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400";
    if (s === "MEDIUM") return "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
    return "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400";
  };

  return (
    <AppLayout>
      <PageHeader
        badgeText="Risk Oversight"
        title="Manager Deal Health & Risk Radar"
        description="Identify stalled sales pipeline opportunities, high discount anomalies, and low margin proposals."
      />

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Activity size={32} className="animate-pulse" />
            <p className="text-sm">Loading deal health data...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Metrics Row */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Deals", value: metrics.totalDeals, cls: "from-blue-600 to-[#0D69B2]" },
                { label: "Healthy", value: metrics.healthyDeals, cls: "from-emerald-500 to-teal-500" },
                { label: "At Risk", value: metrics.atRiskDeals, cls: "from-amber-400 to-orange-500" },
                { label: "Critical", value: metrics.criticalDeals, cls: "from-red-500 to-rose-600" },
                { label: "Open Alerts", value: metrics.openAlerts, cls: "from-slate-500 to-slate-600" },
                { label: "Critical Alerts", value: metrics.criticalAlerts, cls: "from-red-600 to-red-700" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="relative overflow-hidden rounded-2xl p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${m.cls} opacity-[0.06]`} />
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{m.value}</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Alert type breakdown */}
          {metrics && Object.keys(metrics.alertsByType).length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <Activity size={15} /> Alert Breakdown by Type
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(metrics.alertsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>{type.replace(/_/g, " ")}</span>
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid xl:grid-cols-2 gap-6">
            {/* Alert list */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Risk Alerts</h3>
                    {alerts.length > 0 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white">{alerts.length}</span>
                    )}
                  </div>
                  <button onClick={fetchData} className="text-slate-400 hover:text-blue-600 transition-colors">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Search size={13} className="text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search alerts..."
                      className="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Filter size={13} className="text-slate-400" />
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

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px]">
                {filteredAlerts.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto mb-3 opacity-40 text-emerald-500" />
                    <p className="text-sm font-medium">No active alerts match your filters.</p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        if (alert.quotation) {
                          // Load health by quotation number — need to find the ID from alert's parent
                          // We use quoteNumber as identifier via the API by looking up the related quotation
                        }
                      }}
                      className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <span className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${severityColor(alert.severity)}`}>
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
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Health Detail */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <HeartPulse size={16} className="text-indigo-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedHealth ? "Deal Health Breakdown" : "Select a Deal"}
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
                    <TrendingDown size={36} className="mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-medium text-slate-500">Select an alert to see full deal health analysis.</p>
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
