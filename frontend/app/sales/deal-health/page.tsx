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
  ChevronRight,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from "lucide-react";

interface Alert {
  id: string;
  alertType: string;
  severity: string;
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

export default function SalesDealHealthPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [quotationHealth, setQuotationHealth] = useState<QuotationHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState<string | null>(null);
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadQuotationHealth = async (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    const res = await apiClient.get<QuotationHealth>(`/deal-health/quotation/${quotationId}`);
    if (res.data) setQuotationHealth(res.data);
  };

  const handleRecalculate = async (quotationId: string) => {
    setRecalculating(quotationId);
    await apiClient.post(`/deal-health/quotation/${quotationId}/recalculate`);
    setRecalculating(null);
    fetchData();
    if (selectedQuotationId === quotationId) loadQuotationHealth(quotationId);
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "HIGH": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "MEDIUM": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      default: return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    }
  };

  return (
    <AppLayout>
      <PageHeader
        badgeText="Deal Governance"
        title="Deal Health & Anomaly Insights"
        description="Monitor stalled proposals, discount anomalies, margin risks, and fulfillment delays."
      />

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Activity size={32} className="animate-pulse" />
            <p className="text-sm">Analyzing deal health...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Metrics */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "My Deals", value: metrics.totalDeals, color: "from-indigo-500 to-violet-500", icon: HeartPulse },
                { label: "Healthy", value: metrics.healthyDeals, color: "from-emerald-500 to-teal-500", icon: CheckCircle2 },
                { label: "At Risk", value: metrics.atRiskDeals, color: "from-amber-500 to-orange-500", icon: TrendingDown },
                { label: "Critical", value: metrics.criticalDeals, color: "from-red-500 to-rose-600", icon: AlertTriangle },
              ].map((m) => (
                <div
                  key={m.label}
                  className="relative overflow-hidden rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${m.color} opacity-10 translate-x-6 -translate-y-6`} />
                  <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${m.color} mb-3`}>
                    <m.icon size={16} className="text-white" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{m.value}</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Active Alerts */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Alerts</h3>
                  {alerts.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">{alerts.length}</span>
                  )}
                </div>
                <button onClick={fetchData} className="text-slate-400 hover:text-indigo-500 transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {alerts.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <CheckCircle2 size={32} className="mx-auto mb-3 opacity-40 text-emerald-500" />
                    <p className="text-sm font-medium">No active alerts — all deals are healthy!</p>
                  </div>
                ) : (
                  alerts.slice(0, 8).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      onClick={() => alert.quotation && loadQuotationHealth(alert.quotation.quoteNumber)}
                    >
                      <span className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg border ${severityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{alert.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{alert.message}</div>
                        {alert.quotation && (
                          <div className="text-[10px] text-indigo-500 font-semibold mt-1">
                            {alert.quotation.quoteNumber} · {alert.quotation.customer.companyName}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quotation Detail */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                <HeartPulse size={16} className="text-indigo-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {quotationHealth ? "Health Detail" : "Select an Alert"}
                </h3>
                {quotationHealth && selectedQuotationId && (
                  <button
                    onClick={() => handleRecalculate(selectedQuotationId)}
                    disabled={recalculating === selectedQuotationId}
                    className="ml-auto text-xs font-semibold px-3 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={recalculating === selectedQuotationId ? "animate-spin" : ""} />
                    Recalculate
                  </button>
                )}
              </div>
              <div className="p-5">
                {!quotationHealth ? (
                  <div className="py-12 text-center text-slate-400">
                    <ChevronRight size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Click an alert to view full health detail for that deal.</p>
                  </div>
                ) : (
                  <DealHealthDetailView
                    data={quotationHealth}
                    onResolve={() => {
                      fetchData();
                      if (selectedQuotationId) loadQuotationHealth(selectedQuotationId);
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
