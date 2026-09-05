"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { apiClient } from "@/lib/api-client";
import {
  Search,
  Filter,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  DollarSign,
  Calendar,
  User,
  Plus,
  RefreshCw,
  Eye,
} from "lucide-react";

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

interface InvoiceItem {
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

export default function FinanceBillingPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (typeFilter !== "ALL") params.invoiceType = typeFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await apiClient.get<InvoiceItem[]>("/billing/invoices", params);
      if (Array.isArray(res.data)) {
        setInvoices(res.data);
      } else if (res.data && (res.data as any).data) {
        setInvoices((res.data as any).data);
      }
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, typeFilter, statusFilter]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenDetail = async (invoice: InvoiceItem) => {
    try {
      const res = await apiClient.get<InvoiceItem>(`/billing/invoices/${invoice.id}`);
      if (res.data) {
        setSelectedInvoice(res.data);
      } else {
        setSelectedInvoice(invoice);
      }
    } catch {
      setSelectedInvoice(invoice);
    }
  };

  const handleOpenRecordPayment = (invoice: InvoiceItem) => {
    setSelectedInvoice(invoice);
    setPaymentAmount(String(invoice.remainingBalance || invoice.amount));
    setPaymentMethod("BANK_TRANSFER");
    setPaymentReference("");
    setPaymentNotes("");
    setIsRecordPaymentOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast("error", "Please enter a valid payment amount greater than 0.");
      return;
    }

    if (amt > selectedInvoice.remainingBalance) {
      showToast("error", `Payment amount cannot exceed remaining balance of ₹${selectedInvoice.remainingBalance}`);
      return;
    }

    setIsSubmittingPayment(true);
    const res = await apiClient.post(`/billing/invoices/${selectedInvoice.id}/payments`, {
      amount: amt,
      paymentMethod,
      reference: paymentReference.trim() || undefined,
      notes: paymentNotes.trim() || undefined,
    });

    if (res.data) {
      showToast("success", `Payment of ₹${amt} recorded successfully!`);
      setIsRecordPaymentOpen(false);
      fetchInvoices();
      if (selectedInvoice) {
        handleOpenDetail(selectedInvoice);
      }
    } else {
      showToast("error", res.error || "Failed to record payment.");
    }
    setIsSubmittingPayment(false);
  };

  const columns: Column<InvoiceItem>[] = [
    {
      header: "Invoice No",
      render: (row) => (
        <div>
          <span className="font-bold text-[#0D69B2] dark:text-blue-400 font-mono text-xs sm:text-sm">
            {row.invoiceNumber}
          </span>
          <div className="text-[10px] text-slate-400">
            {row.invoiceType === "RECURRING_CYCLE" ? "Recurring Subscription" : "One-Time Billing"}
          </div>
        </div>
      ),
    },
    {
      header: "Customer Account",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
            {row.customer?.companyName || row.customer?.name || "Customer Account"}
          </div>
          <div className="text-[11px] text-slate-400">{row.customer?.contactEmail || ""}</div>
        </div>
      ),
    },
    {
      header: "Type",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            row.invoiceType === "RECURRING_CYCLE"
              ? "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300"
              : "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
          }`}
        >
          {row.invoiceType === "RECURRING_CYCLE" ? "Recurring" : "One-Time"}
        </span>
      ),
    },
    {
      header: "Total Amount",
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
          ₹{row.amount.toLocaleString()}
        </span>
      ),
    },
    {
      header: "Balance",
      render: (row) => (
        <span
          className={`font-semibold font-mono ${
            row.remainingBalance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          ₹{row.remainingBalance.toLocaleString()}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={
            row.status === "PAID"
              ? "success"
              : row.status === "PARTIALLY_PAID"
              ? "warning"
              : row.status === "CANCELLED"
              ? "danger"
              : "warning"
          }
          label={row.status}
        />
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenDetail(row)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
          >
            <Eye size={13} />
            <span>View</span>
          </button>
          {row.remainingBalance > 0 && row.status !== "CANCELLED" && (
            <button
              onClick={() => handleOpenRecordPayment(row)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#0D69B2] hover:bg-[#0b5a99] text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <CreditCard size={13} />
              <span>Record Pay</span>
            </button>
          )}
        </div>
      ),
    },
  ];

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

      <PageHeader
        badgeText="Accounts Receivable & Billing"
        title="Commercial Billing & Invoicing Operations"
        description="Manage commercial invoice generation, payment collections, and recurring billing cycles."
        actions={
          <button
            onClick={fetchInvoices}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number or customer..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Invoice Types</option>
              <option value="ONE_TIME">One-Time Billing</option>
              <option value="RECURRING_CYCLE">Recurring Subscriptions</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-7 h-7 animate-spin text-[#0D69B2] mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Loading invoice records...</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={invoices}
            onRowClick={(row) => handleOpenDetail(row)}
            emptyMessage="No billing records found matching criteria."
          />
        )}
      </div>

      {/* INVOICE DETAIL DRAWER / MODAL */}
      {selectedInvoice && !isRecordPaymentOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0D69B2] flex items-center justify-center font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedInvoice.invoiceNumber}</span>
                    <StatusBadge
                      type={selectedInvoice.status === "PAID" ? "success" : "warning"}
                      label={selectedInvoice.status}
                    />
                  </h3>
                  <p className="text-xs text-slate-500">
                    Type: {selectedInvoice.invoiceType === "RECURRING_CYCLE" ? "Recurring Subscription" : "One-Time Billing"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Customer & Dates Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-xs sm:text-sm">
              <div>
                <span className="text-slate-400 font-medium block">Customer Account</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedInvoice.customer?.companyName || selectedInvoice.customer?.name}
                </span>
                <span className="text-slate-500 block text-xs">{selectedInvoice.customer?.contactEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Payment Terms & Due Date</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </span>
                {selectedInvoice.quotation && (
                  <span className="text-slate-500 block text-xs">Quotation Ref: {selectedInvoice.quotation.quoteNumber}</span>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Invoice Line Items</h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs sm:text-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Item Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedInvoice.lines && selectedInvoice.lines.length > 0 ? (
                      selectedInvoice.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{l.description}</td>
                          <td className="p-3 text-center text-slate-600 dark:text-slate-400">{l.quantity}</td>
                          <td className="p-3 text-right text-slate-600 dark:text-slate-400 font-mono">₹{l.unitPrice.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white font-mono">₹{l.totalAmount.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                          Standard commercial invoice line items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Financial Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
              <div className="space-y-1 text-xs">
                <div className="text-slate-500">
                  Subtotal: <span className="font-bold font-mono">₹{selectedInvoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="text-emerald-600 dark:text-emerald-400">
                  Total Discount: <span className="font-bold font-mono">-₹{selectedInvoice.discountTotal.toLocaleString()}</span>
                </div>
                <div className="text-slate-500">
                  Tax: <span className="font-bold font-mono">₹{selectedInvoice.taxTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase font-bold">Total Invoice Amount</div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                  ₹{selectedInvoice.amount.toLocaleString()}
                </div>
                <div className="text-xs font-semibold mt-0.5">
                  Paid: <span className="text-emerald-600 font-mono">₹{selectedInvoice.paidAmount.toLocaleString()}</span> | Remaining:{" "}
                  <span className="text-amber-600 font-mono">₹{selectedInvoice.remainingBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment History Section */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Payment History</h4>
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedInvoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          ₹{p.amount.toLocaleString()}
                        </span>
                        <div className="text-slate-500">
                          Method: {p.paymentMethod} {p.gateway === "RAZORPAY" ? "(Razorpay Gateway)" : ""}
                        </div>
                        {p.gatewayPaymentId && (
                          <div className="text-[10px] font-mono text-slate-400">
                            Pay ID: {p.gatewayPaymentId} | Order: {p.gatewayOrderId}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">{new Date(p.transactionDate).toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{p.createdBy || "Recorded"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs text-slate-400 italic">
                  No payments recorded for this invoice yet.
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Close
              </button>
              {selectedInvoice.remainingBalance > 0 && selectedInvoice.status !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={() => handleOpenRecordPayment(selectedInvoice)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0D69B2] hover:bg-[#0b5a99] text-white shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard size={14} />
                  <span>Record Payment</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isRecordPaymentOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard size={18} className="text-[#0D69B2]" />
                <span>Record Manual Payment</span>
              </h3>
              <button onClick={() => setIsRecordPaymentOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100">{selectedInvoice.invoiceNumber}</div>
              <div className="text-slate-600 dark:text-slate-300">
                Customer: {selectedInvoice.customer?.companyName || selectedInvoice.customer?.name}
              </div>
              <div className="text-amber-700 dark:text-amber-400 font-semibold font-mono">
                Remaining Balance: ₹{selectedInvoice.remainingBalance.toLocaleString()}
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.remainingBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                >
                  <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                  <option value="UPI">UPI Direct Payment</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="OTHER">Other Manual Method</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transaction Reference / UTR Number
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. UTR-9876543210"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Notes / Comments
                </label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional internal finance notes..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0D69B2] hover:bg-[#0b5a99] text-white shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingPayment && <RefreshCw size={12} className="animate-spin" />}
                  <span>Confirm & Save Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
