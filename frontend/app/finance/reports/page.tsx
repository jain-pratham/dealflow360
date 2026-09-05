"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import KpiCard from "@/components/dashboard/KpiCard";
import ReportChart from "@/components/dashboard/ReportChart";
import ReportFilterBar, { FilterState } from "@/components/dashboard/ReportFilterBar";
import { apiClient } from "@/lib/api-client";
import { CreditCard, DollarSign, Repeat, Truck, Package } from "lucide-react";

export default function FinanceReportsPage() {
  const [activeTab, setActiveTab] = useState<string>("billing");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});

  const [data, setData] = useState<any>(null);

  const fetchFinanceReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);
      if (filters.customerTier) params.append("customerTier", filters.customerTier);
      if (filters.currency) params.append("currency", filters.currency);

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
    fetchFinanceReports();
  }, [fetchFinanceReports]);

  const tabs = [
    { id: "billing", label: "Invoicing & Revenue", icon: CreditCard },
    { id: "payments", label: "Payments & Gateway", icon: DollarSign },
    { id: "subscriptions", label: "Recurring Subscriptions", icon: Repeat },
    { id: "fulfillment", label: "Fulfillment SLAs", icon: Truck },
    { id: "warehouses", label: "Warehouse Stock", icon: Package },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Financial Control"
        title="Finance Reports Hub"
        description="Comprehensive real-time reporting on accounts receivable, cash collection, subscription schedules, and inventory values."
      />

      <ReportFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchFinanceReports}
        showStatusFilter={false}
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
            onClick={fetchFinanceReports}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Total Invoices"
              value={data?.totalInvoices ?? 0}
              loading={loading}
            />
            <KpiCard
              title="Paid Invoices"
              value={data?.paidCount ?? 0}
              variant="success"
              loading={loading}
            />
            <KpiCard
              title="Unpaid Invoices"
              value={data?.unpaidCount ?? 0}
              variant="warning"
              loading={loading}
            />
            <KpiCard
              title="Overdue Invoices"
              value={data?.overdueCount ?? 0}
              variant="danger"
              loading={loading}
            />
          </div>

          <ReportChart
            title="Invoice Status Distribution"
            type="bar"
            data={Object.entries(data?.statusDistribution || {}).map(([s, c]) => ({
              name: s,
              count: c,
            }))}
            dataKeys={[{ key: "count", name: "Invoices Count", color: "#6366f1" }]}
          />
        </div>
      )}

      {activeTab === "payments" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Total Payments"
              value={data?.totalAttempts ?? 0}
              loading={loading}
            />
            <KpiCard
              title="Successful"
              value={data?.successCount ?? 0}
              variant="success"
              loading={loading}
            />
            <KpiCard
              title="Failed"
              value={data?.failedCount ?? 0}
              variant="danger"
              loading={loading}
            />
            <KpiCard
              title="Success Rate"
              value={`${data?.successRate ?? 0}%`}
              variant="info"
              loading={loading}
            />
          </div>
        </div>
      )}

      {activeTab === "subscriptions" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <KpiCard
              title="Active Contracts"
              value={data?.activeSubscriptions ?? 0}
              variant="success"
              loading={loading}
            />
            <KpiCard
              title="Monthly Recurring Revenue"
              value={`₹ ${data?.monthlyRecurringRevenue?.toLocaleString() ?? 0}`}
              variant="info"
              loading={loading}
            />
            <KpiCard
              title="Overdue Schedules"
              value={data?.overdueSchedulesCount ?? 0}
              variant="danger"
              loading={loading}
            />
          </div>
        </div>
      )}

      {activeTab === "fulfillment" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <KpiCard
              title="Total Allocated"
              value={data?.totalQuantityAllocated ?? 0}
              loading={loading}
            />
            <KpiCard
              title="Total Fulfilled"
              value={data?.totalQuantityFulfilled ?? 0}
              variant="success"
              loading={loading}
            />
            <KpiCard
              title="Fulfillment Rate"
              value={`${data?.fulfillmentRate ?? 0}%`}
              variant="info"
              loading={loading}
            />
          </div>
        </div>
      )}

      {activeTab === "warehouses" && (
        <div className="space-y-6">
          <ReportChart
            title="Warehouse Stock Levels (OnHand vs Available)"
            type="bar"
            data={(data?.warehouses || []).map((w: any) => ({
              name: w.name,
              stockOnHand: w.stockOnHand,
              availableStock: w.availableStock,
            }))}
            dataKeys={[
              { key: "stockOnHand", name: "On Hand", color: "#6366f1" },
              { key: "availableStock", name: "Available", color: "#10b981" },
            ]}
          />
        </div>
      )}
    </AppLayout>
  );
}
