"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import KpiCard from "@/components/dashboard/KpiCard";
import ReportChart from "@/components/dashboard/ReportChart";
import ReportFilterBar, { FilterState } from "@/components/dashboard/ReportFilterBar";
import { apiClient } from "@/lib/api-client";
import { BarChart3, FileSpreadsheet, Percent, CheckSquare, HeartPulse } from "lucide-react";

export default function SalesManagerReportsPage() {
  const [activeTab, setActiveTab] = useState<string>("sales");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});

  const [data, setData] = useState<any>(null);

  const fetchManagerReports = useCallback(async () => {
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
      const res = await apiClient.get(`/reports/${activeTab}${queryString}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || `Failed to load ${activeTab} report data`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  useEffect(() => {
    fetchManagerReports();
  }, [fetchManagerReports]);

  const tabs = [
    { id: "sales", label: "Team Sales & Revenue", icon: BarChart3 },
    { id: "quotations", label: "Quotation Funnel", icon: FileSpreadsheet },
    { id: "discounts", label: "Discount Leakage", icon: Percent },
    { id: "approvals", label: "Approval Queue Velocity", icon: CheckSquare },
    { id: "deal-health", label: "Deal Health", icon: HeartPulse },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Team Analytics"
        title="Sales Manager Reports Hub"
        description="Comprehensive team performance metrics, quotation conversion funnel, discount leakage, and deal health governance."
      />

      <ReportFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchManagerReports}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center justify-between text-xs">
          <span>{error}</span>
          <button
            onClick={fetchManagerReports}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Team Quotations"
              value={data?.totalQuotations ?? 0}
              loading={loading}
            />
            <KpiCard
              title="Confirmed Deals"
              value={data?.confirmedQuotations ?? 0}
              variant="success"
              loading={loading}
            />
            <KpiCard
              title="Conversion Rate"
              value={`${data?.conversionRate ?? 0}%`}
              variant="info"
              loading={loading}
            />
            <KpiCard
              title="Avg Deal Value"
              value={`₹ ${data?.averageDealValue?.toLocaleString() ?? 0}`}
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportChart
              title="Daily Team Activity & Revenue Trend"
              type="area"
              data={data?.trend || []}
              dataKeys={[
                { key: "revenue", name: "Revenue (INR)", color: "#10b981" },
                { key: "quotations", name: "Quotations Count", color: "#6366f1" },
              ]}
            />
            <ReportChart
              title="Confirmed Revenue by Sales Representative"
              type="bar"
              data={Object.entries(data?.revenueBySalesRep || {}).map(([rep, val]) => ({
                name: rep,
                revenue: val,
              }))}
              dataKeys={[{ key: "revenue", name: "Confirmed Revenue", color: "#6366f1" }]}
            />
          </div>
        </div>
      )}

      {activeTab === "quotations" && (
        <div className="space-y-6">
          <ReportChart
            title="Quotation Conversion Funnel"
            type="bar"
            data={(data?.funnel || []).map((f: any) => ({
              name: f.status,
              count: f.count,
            }))}
            dataKeys={[{ key: "count", name: "Quotations Count", color: "#8b5cf6" }]}
          />
        </div>
      )}

      {activeTab === "discounts" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <KpiCard
              title="Avg Line Discount"
              value={`${data?.averageDiscountPercent ?? 0}%`}
              variant="warning"
              loading={loading}
            />
            <KpiCard
              title="Total Discount Amount"
              value={`₹ ${data?.totalDiscountAmount?.toLocaleString() ?? 0}`}
              variant="danger"
              loading={loading}
            />
            <KpiCard
              title="Approval Triggers"
              value={data?.approvalRequiredCount ?? 0}
              variant="info"
              loading={loading}
            />
          </div>
        </div>
      )}

      {activeTab === "approvals" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            <KpiCard
              title="Total Requests"
              value={data?.totalRequests ?? 0}
              loading={loading}
            />
            <KpiCard
              title="Pending"
              value={data?.pending ?? 0}
              variant="warning"
              loading={loading}
            />
            <KpiCard
              title="Approved"
              value={data?.approved ?? 0}
              variant="success"
              loading={loading}
            />
            <KpiCard
              title="Avg Hours"
              value={`${data?.avgApprovalTimeHours ?? 0} hrs`}
              variant="info"
              loading={loading}
            />
          </div>
        </div>
      )}

      {activeTab === "deal-health" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <KpiCard
              title="Healthy Deals"
              value={data?.healthyCount ?? 0}
              variant="success"
              loading={loading}
            />
            <KpiCard
              title="At Risk Deals"
              value={data?.atRiskCount ?? 0}
              variant="warning"
              loading={loading}
            />
            <KpiCard
              title="Critical Deals"
              value={data?.criticalCount ?? 0}
              variant="danger"
              loading={loading}
            />
          </div>
        </div>
      )}
    </AppLayout>
  );
}
