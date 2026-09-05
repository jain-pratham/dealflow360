"use client";

import React, { useEffect, useState, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import KpiCard from "@/components/dashboard/KpiCard";
import ReportChart from "@/components/dashboard/ReportChart";
import { apiClient } from "@/lib/api-client";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Repeat,
  Truck,
  DollarSign,
} from "lucide-react";

export default function FinanceDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [billingReport, setBillingReport] = useState<any>(null);
  const [paymentReport, setPaymentReport] = useState<any>(null);
  const [subscriptionReport, setSubscriptionReport] = useState<any>(null);
  const [fulfillmentReport, setFulfillmentReport] = useState<any>(null);

  const fetchFinanceDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [billRes, pmtRes, subRes, fulRes] = await Promise.all([
        apiClient.get("/reports/billing"),
        apiClient.get("/reports/payments"),
        apiClient.get("/reports/subscriptions"),
        apiClient.get("/reports/fulfillment"),
      ]);

      setBillingReport(billRes.data);
      setPaymentReport(pmtRes.data);
      setSubscriptionReport(subRes.data);
      setFulfillmentReport(fulRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load finance dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceDashboard();
  }, [fetchFinanceDashboard]);

  const formattedInvoiced = billingReport?.amountByCurrency?.["INR"]
    ? `₹ ${billingReport.amountByCurrency["INR"].toLocaleString()}`
    : "₹ 0";

  const formattedPaid = billingReport?.paidByCurrency?.["INR"]
    ? `₹ ${billingReport.paidByCurrency["INR"].toLocaleString()}`
    : "₹ 0";

  const formattedOutstanding = billingReport?.outstandingByCurrency?.["INR"]
    ? `₹ ${billingReport.outstandingByCurrency["INR"].toLocaleString()}`
    : "₹ 0";

  const formattedOverdue = billingReport?.overdueByCurrency?.["INR"]
    ? `₹ ${billingReport.overdueByCurrency["INR"].toLocaleString()}`
    : "₹ 0";

  const invoiceStatusData = Object.entries(billingReport?.statusDistribution || {}).map(
    ([status, val]) => ({
      name: status,
      count: val,
    })
  );

  const paymentGatewayData = Object.entries(paymentReport?.gatewayBreakdown || {}).map(
    ([gw, val]: [string, any]) => ({
      name: gw,
      success: val.success,
      failed: val.failed,
      collected: val.collected,
    })
  );

  return (
    <AppLayout>
      <PageHeader
        badgeText="Financial Controller"
        title="Finance Dashboard"
        description="Real-time cash flow performance, invoice collections, payment success rates, and subscription MRR."
      />

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center justify-between text-xs">
          <span>{error}</span>
          <button
            onClick={fetchFinanceDashboard}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <KpiCard
          title="Total Invoiced"
          value={formattedInvoiced}
          subtext={`${billingReport?.totalInvoices ?? 0} total invoices`}
          icon={CreditCard}
          loading={loading}
        />
        <KpiCard
          title="Total Collected"
          value={formattedPaid}
          subtext={`${billingReport?.paidCount ?? 0} paid invoices`}
          icon={CheckCircle2}
          variant="success"
          loading={loading}
        />
        <KpiCard
          title="Outstanding Balance"
          value={formattedOutstanding}
          subtext={`${billingReport?.unpaidCount ?? 0} unpaid invoices`}
          icon={Clock}
          variant="warning"
          loading={loading}
        />
        <KpiCard
          title="Overdue Amount"
          value={formattedOverdue}
          subtext={`${billingReport?.overdueCount ?? 0} overdue invoices`}
          icon={AlertTriangle}
          variant="danger"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KpiCard
          title="Monthly Recurring Revenue"
          value={`₹ ${subscriptionReport?.monthlyRecurringRevenue?.toLocaleString() ?? 0}`}
          subtext={`${subscriptionReport?.activeSubscriptions ?? 0} Active Subs`}
          icon={Repeat}
          variant="info"
          loading={loading}
        />
        <KpiCard
          title="Payment Success Rate"
          value={`${paymentReport?.successRate ?? 0}%`}
          subtext={`${paymentReport?.successCount ?? 0} successful payments`}
          icon={DollarSign}
          variant="success"
          loading={loading}
        />
        <KpiCard
          title="Failed Payments"
          value={paymentReport?.failedCount ?? 0}
          subtext={`₹ ${paymentReport?.failedAmount?.toLocaleString() ?? 0} uncollected`}
          icon={AlertTriangle}
          variant="danger"
          loading={loading}
        />
        <KpiCard
          title="Pending Fulfillment"
          value={fulfillmentReport?.pendingCount ?? 0}
          subtext={`${fulfillmentReport?.backorderedOrdersCount ?? 0} Backorders`}
          icon={Truck}
          variant="warning"
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReportChart
          title="Invoice Status Distribution"
          description="Breakdown of paid, unpaid, partially paid, and cancelled invoices"
          type="bar"
          data={invoiceStatusData}
          dataKeys={[{ key: "count", name: "Invoices Count", color: "#6366f1" }]}
        />

        <ReportChart
          title="Payment Attempts by Gateway"
          description="Success vs failure count across payment gateways"
          type="bar"
          data={paymentGatewayData}
          dataKeys={[
            { key: "success", name: "Successful Payments", color: "#10b981" },
            { key: "failed", name: "Failed Attempts", color: "#ef4444" },
          ]}
        />
      </div>
    </AppLayout>
  );
}
