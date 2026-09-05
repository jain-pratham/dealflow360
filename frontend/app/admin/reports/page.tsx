"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import KpiCard from "@/components/dashboard/KpiCard";
import ReportChart from "@/components/dashboard/ReportChart";
import ReportFilterBar, { FilterState } from "@/components/dashboard/ReportFilterBar";
import { apiClient } from "@/lib/api-client";
import {
  BarChart3,
  FileSpreadsheet,
  Percent,
  CheckSquare,
  Truck,
  CreditCard,
  Repeat,
  HeartPulse,
  Users,
  Package,
} from "lucide-react";

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<string>("sales");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});

  const [data, setData] = useState<any>(null);

  const fetchReportData = useCallback(async () => {
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
    fetchReportData();
  }, [fetchReportData]);

  const tabs = [
    { id: "sales", label: "Sales & Revenue", icon: BarChart3 },
    { id: "quotations", label: "Quotation Funnel", icon: FileSpreadsheet },
    { id: "discounts", label: "Discount Leakage", icon: Percent },
    { id: "approvals", label: "Approval Velocity", icon: CheckSquare },
    { id: "fulfillment", label: "Fulfillment SLAs", icon: Truck },
    { id: "warehouses", label: "Warehouse Stock", icon: Package },
    { id: "billing", label: "Billing & Invoices", icon: CreditCard },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "subscriptions", label: "Subscriptions", icon: Repeat },
    { id: "deal-health", label: "Deal Health", icon: HeartPulse },
    { id: "customers", label: "Customers", icon: Users },
    { id: "products", label: "Top Products", icon: Package },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Executive Intelligence"
        title="Platform Analytics & Reports Hub"
        description="Comprehensive real-time reporting across sales pipeline, discount governance, fulfillment SLAs, and financial streams."
      />

      <ReportFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchReportData}
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
            onClick={fetchReportData}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dynamic Content by Tab */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Total Quotations"
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
              title="Daily Quotation & Revenue Execution"
              type="area"
              data={data?.trend || []}
              dataKeys={[
                { key: "revenue", name: "Revenue (INR)", color: "#10b981" },
                { key: "quotations", name: "Quotations Count", color: "#6366f1" },
              ]}
            />

            <ReportChart
              title="Revenue Breakdown by Customer Tier"
              type="bar"
              data={Object.entries(data?.revenueByTier || {}).map(([tier, val]) => ({
                name: tier,
                revenue: val,
              }))}
              dataKeys={[{ key: "revenue", name: "Confirmed Revenue", color: "#8b5cf6" }]}
            />
          </div>
        </div>
      )}

      {activeTab === "quotations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <KpiCard
              title="Total Pipeline Volume"
              value={data?.totalQuotations ?? 0}
              loading={loading}
            />
            <KpiCard
              title="Top Funnel Stage"
              value={data?.funnel?.[0]?.status || "DRAFT"}
              subtext={`${data?.funnel?.[0]?.count || 0} Quotes in Stage`}
              variant="info"
              loading={loading}
            />
            <KpiCard
              title="Confirmed Stage"
              value={data?.funnel?.find((f: any) => f.status === "CONFIRMED")?.count || 0}
              subtext="Successfully closed deals"
              variant="success"
              loading={loading}
            />
          </div>

          <ReportChart
            title="Quotation Conversion Funnel Stages"
            type="bar"
            data={(data?.funnel || []).map((f: any) => ({
              name: f.status,
              count: f.count,
              amount: f.totalAmount,
            }))}
            dataKeys={[
              { key: "count", name: "Quotations Count", color: "#6366f1" },
            ]}
          />
        </div>
      )}

      {activeTab === "discounts" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Avg Line Discount"
              value={`${data?.averageDiscountPercent ?? 0}%`}
              variant="warning"
              loading={loading}
            />
            <KpiCard
              title="Total Discount Granted"
              value={`₹ ${data?.totalDiscountAmount?.toLocaleString() ?? 0}`}
              variant="danger"
              loading={loading}
            />
            <KpiCard
              title="Discounted Lines Count"
              value={data?.quotesWithDiscount ?? 0}
              loading={loading}
            />
            <KpiCard
              title="Approval Triggers"
              value={data?.approvalRequiredCount ?? 0}
              subtext="Over-threshold discount requests"
              variant="info"
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportChart
              title="Discount Amount by Customer Tier"
              type="bar"
              data={Object.entries(data?.discountByTier || {}).map(([t, val]) => ({
                name: t,
                discount: val,
              }))}
              dataKeys={[{ key: "discount", name: "Discount Amount", color: "#ef4444" }]}
            />
            <ReportChart
              title="Discount Amount by Product Category"
              type="bar"
              data={Object.entries(data?.discountByCategory || {}).map(([c, val]) => ({
                name: c,
                discount: val,
              }))}
              dataKeys={[{ key: "discount", name: "Discount Amount", color: "#f59e0b" }]}
            />
          </div>
        </div>
      )}

      {activeTab === "approvals" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Total Requests"
              value={data?.totalRequests ?? 0}
              loading={loading}
            />
            <KpiCard
              title="Pending Approval"
              value={data?.pending ?? 0}
              variant="warning"
              loading={loading}
            />
            <KpiCard
              title="Approved Count"
              value={data?.approved ?? 0}
              variant="success"
              loading={loading}
            />
            <KpiCard
              title="Avg Turnaround Time"
              value={`${data?.avgApprovalTimeHours ?? 0} hrs`}
              variant="info"
              loading={loading}
            />
          </div>
        </div>
      )}

      {activeTab === "fulfillment" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Allocated Items"
              value={data?.totalQuantityAllocated ?? 0}
              loading={loading}
            />
            <KpiCard
              title="Fulfilled Quantity"
              value={data?.totalQuantityFulfilled ?? 0}
              variant="success"
              loading={loading}
            />
            <KpiCard
              title="Backordered Quantity"
              value={data?.totalQuantityBackordered ?? 0}
              variant="danger"
              loading={loading}
            />
            <KpiCard
              title="Fulfillment SLA Rate"
              value={`${data?.fulfillmentRate ?? 0}%`}
              variant="info"
              loading={loading}
            />
          </div>

          <ReportChart
            title="Warehouse Allocation & Fulfillment Performance"
            type="bar"
            data={data?.warehousePerformance || []}
            dataKeys={[
              { key: "allocated", name: "Allocated Quantity", color: "#6366f1" },
              { key: "fulfilled", name: "Fulfilled Quantity", color: "#10b981" },
            ]}
          />
        </div>
      )}

      {activeTab === "warehouses" && (
        <div className="space-y-6">
          <ReportChart
            title="Warehouse Stock Breakdown (OnHand vs Available)"
            type="bar"
            data={(data?.warehouses || []).map((w: any) => ({
              name: w.name,
              stockOnHand: w.stockOnHand,
              availableStock: w.availableStock,
              reservedStock: w.reservedStock,
            }))}
            dataKeys={[
              { key: "stockOnHand", name: "On Hand", color: "#6366f1" },
              { key: "availableStock", name: "Available", color: "#10b981" },
              { key: "reservedStock", name: "Reserved", color: "#f59e0b" },
            ]}
          />
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
              title="Failed Attempts"
              value={data?.failedCount ?? 0}
              variant="danger"
              loading={loading}
            />
            <KpiCard
              title="Collected Amount"
              value={`₹ ${data?.totalCollected?.toLocaleString() ?? 0}`}
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
              title="Overdue Billing Schedules"
              value={data?.overdueSchedulesCount ?? 0}
              variant="danger"
              loading={loading}
            />
          </div>
        </div>
      )}

      {activeTab === "deal-health" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <KpiCard
              title="Deals Analyzed"
              value={data?.totalDealsAnalyzed ?? 0}
              loading={loading}
            />
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

      {activeTab === "customers" && (
        <div className="space-y-6">
          <ReportChart
            title="Top 10 Customers by Confirmed Revenue"
            type="bar"
            data={(data?.topCustomers || []).map((c: any) => ({
              name: c.companyName || c.name,
              revenue: c.confirmedRevenue,
            }))}
            dataKeys={[{ key: "revenue", name: "Confirmed Revenue", color: "#10b981" }]}
          />
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-6">
          <ReportChart
            title="Top 10 Selling Products by Revenue"
            type="bar"
            data={(data?.topProducts || []).map((p: any) => ({
              name: p.name,
              revenue: p.revenue,
              quantity: p.quantity,
            }))}
            dataKeys={[{ key: "revenue", name: "Revenue", color: "#6366f1" }]}
          />
        </div>
      )}
    </AppLayout>
  );
}
