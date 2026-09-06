"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/DataTable";
import {
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  Calendar,
  Building2,
  ShieldCheck,
  RefreshCw,
  Clock,
  DollarSign,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  lineType: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  gateway: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  status: string;
  reference?: string;
  notes?: string;
  createdBy?: string;
  transactionDate: string;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  quotationId?: string;
  customerId: string;
  invoiceType: "ONE_TIME" | "RECURRING_CYCLE" | "CREDIT_NOTE";
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  amount: number;
  paidAmount: number;
  remainingBalance: number;
  currency: string;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  issueDate: string;
  dueDate: string;
  customer?: {
    name: string;
    companyName: string;
    contactEmail: string;
  };
  quotation?: {
    quoteNumber: string;
  };
  lines?: InvoiceLine[];
  payments?: PaymentRecord[];
}

export default function CustomerPortalInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchInvoiceDetail = async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<InvoiceDetail>(`/customer-portal/invoices/${invoiceId}`);
      if (res.data) {
        setInvoice(res.data);
      } else {
        setError(res.error || "Invoice not found or access denied.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load invoice details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetail();
  }, [invoiceId]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Helper to dynamically load Razorpay Checkout Script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Trigger Razorpay Test Checkout Flow
  const handlePayNow = async () => {
    if (!invoice) return;

    if (invoice.currency && invoice.currency.toUpperCase() !== "INR") {
      showToast("error", "Online payment via Razorpay is currently available for INR currency invoices only.");
      return;
    }

    setIsProcessingPayment(true);
    try {
      // 1. Load Script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        showToast("error", "Failed to load Razorpay Payment Checkout SDK. Check internet connection.");
        setIsProcessingPayment(false);
        return;
      }

      // 2. Call Backend to Create Razorpay Order
      const orderRes = await apiClient.post<{
        orderId: string;
        amount: number;
        amountInPaise: number;
        currency: string;
        keyId: string;
        invoiceNumber: string;
        customerName: string;
        customerEmail: string;
      }>("/payments/razorpay/order", { invoiceId: invoice.id });

      if (!orderRes.data) {
        showToast("error", orderRes.error || "Failed to create payment order.");
        setIsProcessingPayment(false);
        return;
      }

      const orderData = orderRes.data;

      // 3. Configure Razorpay Options
      const options: any = {
        key: orderData.keyId,
        amount: orderData.amountInPaise,
        currency: orderData.currency || "INR",
        name: "DealFlow360",
        description: `Invoice Payment: ${orderData.invoiceNumber}`,
        image: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        prefill: {
          name: orderData.customerName || "Valued Customer",
          email: orderData.customerEmail || "customer@example.com",
        },
        theme: {
          color: "#0D69B2",
        },
        handler: async (response: any) => {
          // 4. Send Payment Credentials to Backend for Mandatory HMAC Signature Verification
          try {
            const verifyRes = await apiClient.post<{ message: string; invoiceStatus: string }>(
              "/payments/razorpay/verify",
              {
                invoiceId: invoice.id,
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id || `pay_test_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || "mock_valid_signature_for_testing",
              },
            );

            if (verifyRes.data) {
              showToast("success", "Payment verified and invoice marked PAID successfully!");
              fetchInvoiceDetail();
            } else {
              showToast("error", verifyRes.error || "Payment signature verification failed.");
            }
          } catch (err: any) {
            showToast("error", "Payment verification error: " + (err.message || "Unknown error"));
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
            showToast("error", "Payment checkout cancelled by user.");
          },
        },
      };

      if ((orderData as any).isLiveOrder !== false) {
        options.order_id = orderData.orderId;
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showToast("error", "Payment creation error: " + (err.message || "Unknown error"));
      setIsProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#0D69B2] mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading invoice detail...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !invoice) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Invoice Not Found</h3>
          <p className="text-xs sm:text-sm text-slate-500">{error || "You do not have permission to view this invoice."}</p>
          <Link
            href="/portal/quotations"
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <ArrowLeft size={14} /> Back to Portal
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
            toastMessage.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-700"
              : "bg-rose-900 text-rose-100 border-rose-700"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/portal/quotations"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#0D69B2] mb-2 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Customer Portal
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>Invoice: {invoice.invoiceNumber}</span>
            <StatusBadge
              type={invoice.status === "PAID" ? "success" : "warning"}
              label={invoice.status}
            />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Issued on {new Date(invoice.issueDate).toLocaleDateString()} | Type:{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {invoice.invoiceType === "RECURRING_CYCLE" ? "Recurring Subscription" : "One-Time Billing"}
            </span>
          </p>
        </div>

        {/* Pay Now Button */}
        {invoice.remainingBalance > 0 && invoice.status !== "CANCELLED" ? (
          <button
            onClick={handlePayNow}
            disabled={isProcessingPayment}
            className="bg-[#0D69B2] hover:bg-[#0b5a99] active:scale-[0.99] transition-all text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessingPayment ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <CreditCard size={18} />
            )}
            <span>Pay Now (₹{invoice.remainingBalance.toLocaleString()})</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 font-bold text-sm">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span>Fully Paid</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Invoice Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Billing Info Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Building2 size={16} className="text-[#0D69B2]" />
              Billed To Customer
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-slate-400 font-medium block">Company / Account</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {invoice.customer?.companyName || invoice.customer?.name}
                </span>
                <span className="text-slate-500 block text-xs mt-0.5">{invoice.customer?.contactEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Due Date & Terms</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </span>
                {invoice.quotation && (
                  <span className="text-slate-500 block text-xs mt-0.5">Quotation Ref: {invoice.quotation.quoteNumber}</span>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Line Items */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <FileText size={16} className="text-[#0D69B2]" />
              Line Items Breakdown
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs sm:text-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Product / Service</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoice.lines && invoice.lines.length > 0 ? (
                    invoice.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                          {l.description}
                          <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                            {l.lineType === "RECURRING" ? "Recurring Service" : "One-Time Product"}
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-600 dark:text-slate-400">{l.quantity}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400 font-mono">₹{l.unitPrice.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white font-mono">₹{l.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                        Commercial invoice items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#0D69B2]" />
              Verified Payment History
            </h3>
            {invoice.payments && invoice.payments.length > 0 ? (
              <div className="space-y-2.5">
                {invoice.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs sm:text-sm"
                  >
                    <div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-base">
                        ₹{p.amount.toLocaleString()}
                      </span>
                      <div className="text-slate-600 dark:text-slate-300 font-medium">
                        Payment Method: {p.paymentMethod} {p.gateway === "RAZORPAY" ? "(Razorpay Test Gateway)" : ""}
                      </div>
                      {p.gatewayPaymentId && (
                        <div className="text-[11px] font-mono text-slate-400">
                          Razorpay Payment ID: {p.gatewayPaymentId}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                        {new Date(p.transactionDate).toLocaleDateString()}
                      </span>
                      <StatusBadge type="success" label={p.status || "SUCCESS"} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-400 italic">
                No payments have been recorded for this invoice yet.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Summary Card */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 sticky top-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <DollarSign size={16} className="text-[#0D69B2]" />
              Payment Summary
            </h3>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">₹{invoice.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Quotation Discount:</span>
                <span className="font-mono font-semibold">-₹{invoice.discountTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax Amount:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">₹{invoice.taxTotal.toLocaleString()}</span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-center text-base font-extrabold text-slate-900 dark:text-white">
                <span>Total Invoice:</span>
                <span className="font-mono text-xl">₹{invoice.amount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                <span>Amount Paid:</span>
                <span className="font-mono">₹{invoice.paidAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400 font-bold pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                <span>Remaining Balance:</span>
                <span className="font-mono text-base">₹{invoice.remainingBalance.toLocaleString()}</span>
              </div>
            </div>

            {invoice.remainingBalance > 0 && invoice.status !== "CANCELLED" && (
              <div className="pt-2">
                <button
                  onClick={handlePayNow}
                  disabled={isProcessingPayment}
                  className="w-full bg-[#0D69B2] hover:bg-[#0b5a99] active:scale-[0.99] transition-all text-white font-bold text-sm py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingPayment ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <CreditCard size={18} />
                  )}
                  <span>Pay Now (Razorpay Test)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
