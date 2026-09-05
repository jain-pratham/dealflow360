"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import KpiCard from "@/components/dashboard/KpiCard";
import ReportChart from "@/components/dashboard/ReportChart";
import { apiClient } from "@/lib/api-client";
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  HeartPulse,
} from "lucide-react";

export default function SalesDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [dealHealthReport, setDealHealthReport] = useState<any>(null);

  const fetchRepDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, salesRes, dhRes] = await Promise.all([
        apiClient.get("/reports/overview"),
        apiClient.get("/reports/sales"),
        apiClient.get("/reports/deal-health"),
      ]);

      setOverview(ovRes.data);
      setSalesReport(salesRes.data);
      setDealHealthReport(dhRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load sales dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepDashboardData();
  }, [fetchRepDashboardData]);

  const formattedRevenue = overview?.revenueByCurrency?.["INR"]
    ? `₹ ${overview.revenueByCurrency["INR"].toLocaleString()}`
    : "₹ 0";

  const trendChartData = salesReport?.trend || [];
  const healthDistributionData = [
    { name: "Healthy (80-100)", value: dealHealthReport?.healthyCount || 0, color: "#10b981" },
    { name: "At Risk (50-79)", value: dealHealthReport?.atRiskCount || 0, color: "#f59e0b" },
    { name: "Critical (<50)", value: dealHealthReport?.criticalCount || 0, color: "#ef4444" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Sales Workspace"
        title="My Sales Performance Dashboard"
        description="Real-time personal sales activity, active quotations, conversion rates, and deal health alerts."
      />

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center justify-between text-xs">
          <span>{error}</span>
          <button
            onClick={fetchRepDashboardData}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KpiCard
          title="My Confirmed Revenue"
          value={formattedRevenue}
          subtext="Total revenue closed"
          icon={DollarSign}
          variant="success"
          loading={loading}
        />
        <KpiCard
          title="My Total Quotations"
          value={overview?.totalQuotations ?? 0}
          subtext={`${overview?.confirmedQuotations ?? 0} Confirmed`}
          icon={FileSpreadsheet}
          loading={loading}
        />
        <KpiCard
          title="Conversion Rate"
          value={`${salesReport?.conversionRate ?? 0}%`}
          subtext="Quotes won vs total"
          icon={CheckCircle2}
          variant="info"
          loading={loading}
        />
        <KpiCard
          title="Critical Deal Alerts"
          value={overview?.criticalDealAlerts ?? 0}
          subtext="Requires immediate rep attention"
          icon={AlertTriangle}
          variant="danger"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <KpiCard
          title="Pending Approvals"
          value={overview?.pendingApprovals ?? 0}
          subtext="Quotations awaiting manager approval"
          icon={Clock}
          variant={overview?.pendingApprovals > 0 ? "warning" : "default"}
          loading={loading}
        />
        <KpiCard
          title="At-Risk Deals"
          value={dealHealthReport?.atRiskCount ?? 0}
          subtext="Moderate deal health risk"
          icon={HeartPulse}
          variant="warning"
          loading={loading}
        />
        <KpiCard
          title="Active Backorders"
          value={overview?.backordersCount ?? 0}
          subtext="Allocations waiting for stock"
          icon={FileSpreadsheet}
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ReportChart
            title="My Sales Activity & Revenue Execution"
            description="Daily quotation creations and confirmed revenue"
            type="area"
            data={trendChartData}
            dataKeys={[
              { key: "revenue", name: "Confirmed Revenue (INR)", color: "#10b981" },
              { key: "quotations", name: "Quotations Count", color: "#6366f1" },
            ]}
          />
        </div>

        <div>
          <ReportChart
            title="My Deal Health Risk Breakdown"
            description="Health status classification of active deals"
            type="pie"
            data={healthDistributionData}
            nameKey="name"
            valueKey="value"
          />
        </div>
      </div>
    </AppLayout>
  );
}
