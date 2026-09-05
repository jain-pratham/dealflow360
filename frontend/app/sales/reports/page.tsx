"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import KpiCard from "@/components/dashboard/KpiCard";
import ReportChart from "@/components/dashboard/ReportChart";
import ReportFilterBar, { FilterState } from "@/components/dashboard/ReportFilterBar";
import { apiClient } from "@/lib/api-client";

export default function SalesRepReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});

  const [salesReport, setSalesReport] = useState<any>(null);
  const [funnelReport, setFunnelReport] = useState<any>(null);

  const fetchRepReports = useCallback(async () => {
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

      const [salesRes, funnelRes] = await Promise.all([
        apiClient.get(`/reports/sales${queryString}`),
        apiClient.get(`/reports/quotations${queryString}`),
      ]);

      setSalesReport(salesRes.data);
      setFunnelReport(funnelRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load sales report data");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRepReports();
  }, [fetchRepReports]);

  return (
    <AppLayout>
      <PageHeader
        badgeText="Personal Performance"
        title="My Sales Analytics Report"
        description="Detailed reporting on personal quotation conversion, revenue velocity, and quotation stage funnel."
      />

      <ReportFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchRepReports}
      />

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center justify-between text-xs">
          <span>{error}</span>
          <button
            onClick={fetchRepReports}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KpiCard
          title="Total Quotations"
          value={salesReport?.totalQuotations ?? 0}
          loading={loading}
        />
        <KpiCard
          title="Confirmed Deals"
          value={salesReport?.confirmedQuotations ?? 0}
          variant="success"
          loading={loading}
        />
        <KpiCard
          title="Conversion Rate"
          value={`${salesReport?.conversionRate ?? 0}%`}
          variant="info"
          loading={loading}
        />
        <KpiCard
          title="Avg Deal Value"
          value={`₹ ${salesReport?.averageDealValue?.toLocaleString() ?? 0}`}
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportChart
          title="Quotation Trend Over Time"
          type="area"
          data={salesReport?.trend || []}
          dataKeys={[
            { key: "revenue", name: "Revenue (INR)", color: "#10b981" },
            { key: "quotations", name: "Quotations Count", color: "#6366f1" },
          ]}
        />

        <ReportChart
          title="My Quotation Stage Funnel"
          type="bar"
          data={(funnelReport?.funnel || []).map((f: any) => ({
            name: f.status,
            count: f.count,
          }))}
          dataKeys={[{ key: "count", name: "Quotations Count", color: "#8b5cf6" }]}
        />
      </div>
    </AppLayout>
  );
}
