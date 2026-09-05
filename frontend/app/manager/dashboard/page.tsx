"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import KpiCard from "@/components/dashboard/KpiCard";
import ReportChart from "@/components/dashboard/ReportChart";
import { apiClient } from "@/lib/api-client";
import {
  DollarSign,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  HeartPulse,
} from "lucide-react";

export default function ManagerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [dealHealthReport, setDealHealthReport] = useState<any>(null);

  const fetchManagerDashboard = useCallback(async () => {
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
      setError(err.response?.data?.message || err.message || "Failed to load manager dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagerDashboard();
  }, [fetchManagerDashboard]);

  const formattedRevenue = overview?.revenueByCurrency?.["INR"]
    ? `₹ ${overview.revenueByCurrency["INR"].toLocaleString()}`
    : "₹ 0";

  const repRevenueData = Object.entries(salesReport?.revenueBySalesRep || {}).map(
    ([rep, rev]) => ({
      name: rep,
      revenue: rev,
    })
  );

  const healthDistributionData = [
    { name: "Healthy (80-100)", value: dealHealthReport?.healthyCount || 0, color: "#10b981" },
    { name: "At Risk (50-79)", value: dealHealthReport?.atRiskCount || 0, color: "#f59e0b" },
    { name: "Critical (<50)", value: dealHealthReport?.criticalCount || 0, color: "#ef4444" },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Team Governance"
        title="Sales Manager Dashboard"
        description="Team sales velocity, discount approval queue status, rep performance, and risk management."
      />

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center justify-between text-xs">
          <span>{error}</span>
          <button
            onClick={fetchManagerDashboard}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KpiCard
          title="Team Confirmed Revenue"
          value={formattedRevenue}
          subtext="Total team revenue closed"
          icon={DollarSign}
          variant="success"
          loading={loading}
        />
        <KpiCard
          title="Team Quotations"
          value={overview?.totalQuotations ?? 0}
          subtext={`${overview?.confirmedQuotations ?? 0} Confirmed`}
          icon={FileSpreadsheet}
          loading={loading}
        />
        <KpiCard
          title="Pending Manager Approvals"
          value={overview?.pendingApprovals ?? 0}
          subtext="Quotations awaiting decision"
          icon={Clock}
          variant={overview?.pendingApprovals > 0 ? "warning" : "default"}
          loading={loading}
        />
        <KpiCard
          title="Critical Deal Alerts"
          value={overview?.criticalDealAlerts ?? 0}
          subtext="High margin or discount risk"
          icon={AlertTriangle}
          variant="danger"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <KpiCard
          title="Team Conversion Rate"
          value={`${salesReport?.conversionRate ?? 0}%`}
          subtext="Overall conversion SLA"
          icon={CheckCircle2}
          variant="info"
          loading={loading}
        />
        <KpiCard
          title="Avg Team Deal Value"
          value={`₹ ${salesReport?.averageDealValue?.toLocaleString() ?? 0}`}
          icon={DollarSign}
          loading={loading}
        />
        <KpiCard
          title="At-Risk Deals"
          value={dealHealthReport?.atRiskCount ?? 0}
          subtext="Monitoring deal health score"
          icon={HeartPulse}
          variant="warning"
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportChart
          title="Confirmed Revenue by Sales Representative"
          description="Performance comparison across sales team members"
          type="bar"
          data={repRevenueData}
          dataKeys={[{ key: "revenue", name: "Revenue (INR)", color: "#6366f1" }]}
        />

        <ReportChart
          title="Team Deal Health Distribution"
          description="Risk score classification breakdown"
          type="pie"
          data={healthDistributionData}
          nameKey="name"
          valueKey="value"
        />
      </div>
    </AppLayout>
  );
}
