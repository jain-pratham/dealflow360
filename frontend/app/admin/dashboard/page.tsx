"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import KpiCard from "@/components/dashboard/KpiCard";
import ReportChart from "@/components/dashboard/ReportChart";
import ReportFilterBar, { FilterState } from "@/components/dashboard/ReportFilterBar";
import { apiClient } from "@/lib/api-client";
import {
  Users,
  Package,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  DollarSign,
  Repeat,
  AlertTriangle,
  HeartPulse,
  Truck,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});

  const [overview, setOverview] = useState<any>(null);
  const [salesReport, setSalesReport] = useState<any>(null);
  const [dealHealthReport, setDealHealthReport] = useState<any>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.customerTier) params.append("customerTier", filters.customerTier);
      if (filters.currency) params.append("currency", filters.currency);
      if (filters.quotationStatus) params.append("quotationStatus", filters.quotationStatus);

      const queryString = params.toString() ? `?${params.toString()}` : "";

      const [ovRes, salesRes, dhRes] = await Promise.all([
        apiClient.get(`/reports/overview${queryString}`),
        apiClient.get(`/reports/sales${queryString}`),
        apiClient.get(`/reports/deal-health${queryString}`),
      ]);

      setOverview(ovRes.data);
      setSalesReport(salesRes.data);
      setDealHealthReport(dhRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Formatted revenue display
  const primaryCurrency = filters.currency || "INR";
  const formattedRevenue = overview?.revenueByCurrency?.[primaryCurrency]
    ? `${primaryCurrency === "INR" ? "₹" : "$"} ${overview.revenueByCurrency[primaryCurrency].toLocaleString()}`
    : `${primaryCurrency === "INR" ? "₹" : "$"} 0`;

  const formattedOutstanding = overview?.outstandingByCurrency?.[primaryCurrency]
    ? `${primaryCurrency === "INR" ? "₹" : "$"} ${overview.outstandingByCurrency[primaryCurrency].toLocaleString()}`
    : `${primaryCurrency === "INR" ? "₹" : "$"} 0`;

  // Chart data formatting
  const trendChartData = salesReport?.trend || [];

  const tierChartData = Object.entries(salesReport?.revenueByTier || {}).map(
    ([tier, rev]) => ({
      name: tier,
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
        badgeText="Enterprise Governance"
        title="Executive Admin Dashboard"
        description="Real-time analytics across platform sales, margin health, fulfillment SLAs, and revenue stream performance."
      />

      <ReportFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchDashboardData}
      />

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center justify-between text-xs">
          <span>{error}</span>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KpiCard
          title="Confirmed Revenue"
          value={formattedRevenue}
          subtext={`Confirmed sales in ${primaryCurrency}`}
          icon={DollarSign}
          variant="success"
          loading={loading}
        />
        <KpiCard
          title="Outstanding Invoices"
          value={formattedOutstanding}
          subtext={`Unpaid balance in ${primaryCurrency}`}
          icon={Clock}
          variant="warning"
          loading={loading}
        />
        <KpiCard
          title="Total Customers"
          value={overview?.totalCustomers ?? 0}
          subtext={`${overview?.activeCustomers ?? 0} Active Accounts`}
          icon={Users}
          variant="info"
          loading={loading}
        />
        <KpiCard
          title="Critical Deal Alerts"
          value={overview?.criticalDealAlerts ?? 0}
          subtext="Deals requiring urgent action"
          icon={AlertTriangle}
          variant="danger"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KpiCard
          title="Total Quotations"
          value={overview?.totalQuotations ?? 0}
          subtext={`${overview?.confirmedQuotations ?? 0} Confirmed`}
          icon={FileSpreadsheet}
          loading={loading}
        />
        <KpiCard
          title="Pending Approvals"
          value={overview?.pendingApprovals ?? 0}
          subtext="Discount & terms approval queue"
          icon={CheckCircle2}
          variant={overview?.pendingApprovals > 0 ? "warning" : "default"}
          loading={loading}
        />
        <KpiCard
          title="Active Subscriptions"
          value={overview?.activeSubscriptions ?? 0}
          subtext="Recurring revenue contracts"
          icon={Repeat}
          variant="info"
          loading={loading}
        />
        <KpiCard
          title="Active Backorders"
          value={overview?.backordersCount ?? 0}
          subtext="Items awaiting inventory allocation"
          icon={Truck}
          variant={overview?.backordersCount > 0 ? "warning" : "default"}
          loading={loading}
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ReportChart
            title="Quotation & Confirmed Revenue Trend"
            description="Daily quotation activity and confirmed revenue execution"
            type="area"
            data={trendChartData}
            dataKeys={[
              { key: "revenue", name: `Revenue (${primaryCurrency})`, color: "#10b981" },
              { key: "quotations", name: "Quotations Count", color: "#6366f1" },
            ]}
          />
        </div>

        <div>
          <ReportChart
            title="Deal Health Risk Distribution"
            description="Portfolio health score classification breakdown"
            type="pie"
            data={healthDistributionData}
            nameKey="name"
            valueKey="value"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportChart
          title="Confirmed Revenue by Customer Tier"
          description="Distribution of deal value across Bronze, Silver, and Gold tiers"
          type="bar"
          data={tierChartData}
          dataKeys={[{ key: "revenue", name: "Revenue", color: "#8b5cf6" }]}
        />

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              System Governance Summary
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live status across core DealFlow360 business engines.
            </p>

            <div className="mt-6 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Conversion Rate</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {salesReport?.conversionRate ?? 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Active Products</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {overview?.totalProducts ?? 0} Items
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Average Deal Value</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {primaryCurrency} {salesReport?.averageDealValue?.toLocaleString() ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <a
              href="/admin/reports"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors"
            >
              View Detailed Analytics Hub →
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
