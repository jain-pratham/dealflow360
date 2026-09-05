"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/DataTable";
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  AlertTriangle,
  Loader2,
  Percent,
  Check,
  Building2,
  User,
  Mail,
} from "lucide-react";

interface LineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  finalUnitPrice: number;
  lineType?: string;
}

interface QuotationCommentItem {
  id: string;
  authorType: string;
  comment: string;
  quotationLineId?: string;
  isNegotiationCounter?: boolean;
  proposedDiscount?: number;
  timestamp: string;
}

interface QuotationDetail {
  id: string;
  quoteNumber: string;
  status: string;
  statusLabel: string;
  isPendingInternalApproval: boolean;
  currency: string;
  subtotalAmount: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  customer: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    address?: string;
  };
  lines: LineItem[];
  comments: QuotationCommentItem[];
}

export default function CustomerQuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const quotationId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Negotiation form state
  const [overallDiscount, setOverallDiscount] = useState<string>("");
  const [negotiationComment, setNegotiationComment] = useState("");
  const [lineDiscounts, setLineDiscounts] = useState<Record<string, string>>({});
  const [submittingNegotiation, setSubmittingNegotiation] = useState(false);
  const [confirmingQuotation, setConfirmingQuotation] = useState(false);

  // General comment state
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchQuotation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<QuotationDetail>(
        `/customer-portal/quotations/${quotationId}`
      );
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setQuotation(res.data);
        const initialLines: Record<string, string> = {};
        res.data.lines.forEach((l) => {
          initialLines[l.id] = String(l.discountPercent || 0);
        });
        setLineDiscounts(initialLines);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load quotation details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [quotationId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    setError(null);
    try {
      const res = await apiClient.post(
        `/customer-portal/quotations/${quotationId}/comments`,
        { comment: newComment }
      );
      if (res.error) {
        setError(res.error);
      } else {
        setNewComment("");
        fetchQuotation();
      }
    } catch (err: any) {
      setError(err.message || "Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitNegotiation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingNegotiation(true);
    setError(null);
    setSuccessMessage(null);

    const lineRequests = Object.entries(lineDiscounts).map(([lineId, val]) => ({
      lineId,
      requestedDiscount: parseFloat(val) || 0,
    }));

    const payload: any = {
      comment: negotiationComment,
      lineRequests,
    };

    if (overallDiscount && !isNaN(parseFloat(overallDiscount))) {
      payload.counterDiscount = parseFloat(overallDiscount);
    }

    try {
      const res = await apiClient.post(
        `/customer-portal/quotations/${quotationId}/negotiation`,
        payload
      );

      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMessage(res.data?.message || "Negotiation request submitted successfully.");
        fetchQuotation();
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit negotiation.");
    } finally {
      setSubmittingNegotiation(false);
    }
  };

  const handleConfirmQuotation = async () => {
    if (!confirm("Are you sure you want to accept and confirm this quotation?")) return;

    setConfirmingQuotation(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await apiClient.post(
        `/customer-portal/quotations/${quotationId}/confirm`
      );

      if (res.error) {
        setError(res.error);
      } else {
        setSuccessMessage("Quotation confirmed successfully! Thank you.");
        fetchQuotation();
      }
    } catch (err: any) {
      setError(err.message || "Failed to confirm quotation.");
    } finally {
      setConfirmingQuotation(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-400">Loading quotation details...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !quotation) {
    return (
      <AppLayout>
        <div className="p-8 max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 my-12">
          <AlertTriangle size={48} className="text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Unable to Load Quotation</h3>
          <p className="text-sm text-slate-400">{error || "Quotation not found or access denied."}</p>
          <Link
            href="/portal/quotations"
            className="inline-flex items-center space-x-2 text-sm font-semibold text-blue-400 hover:underline"
          >
            <ArrowLeft size={16} />
            <span>Back to My Quotations</span>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: quotation.currency || "USD",
    }).format(amount);

  const canAction =
    quotation.status === "SENT" ||
    quotation.status === "UNDER_NEGOTIATION" ||
    quotation.status === "APPROVED";

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/portal/quotations"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Quotations</span>
          </Link>
        </div>

        <PageHeader
          badgeText="Customer Quotation Portal"
          title={`Quotation: ${quotation.quoteNumber}`}
          description={`Issued on ${new Date(quotation.createdAt).toLocaleDateString()} for ${quotation.customer.companyName}`}
          actions={
            <div className="flex items-center space-x-3">
              <StatusBadge
                type={
                  quotation.status === "CONFIRMED"
                    ? "success"
                    : quotation.status === "SENT"
                    ? "primary"
                    : "warning"
                }
                label={quotation.statusLabel}
              />

              {canAction && !quotation.isPendingInternalApproval && (
                <button
                  onClick={handleConfirmQuotation}
                  disabled={confirmingQuotation}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-2"
                >
                  {confirmingQuotation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>Confirm Quotation</span>
                </button>
              )}
            </div>
          }
        />

        {/* Notifications / Feedback */}
        {successMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-3 text-emerald-400 text-sm">
            <CheckCircle2 size={20} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center space-x-3 text-red-400 text-sm">
            <AlertTriangle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {quotation.isPendingInternalApproval && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center space-x-3 text-amber-400 text-sm">
            <Clock size={20} className="shrink-0" />
            <span>
              Your counter-discount request is currently undergoing internal manager review. Confirmation will be enabled once approved.
            </span>
          </div>
        )}

        {/* Summary Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 size={18} className="text-blue-500" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 uppercase font-semibold">Company Name</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{quotation.customer.companyName}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Contact Person</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{quotation.customer.contactName}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Email</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{quotation.customer.email}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-semibold">Phone</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{quotation.customer.phone || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Summary Totals</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(quotation.subtotalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-500 font-semibold">
                <span>Total Discount</span>
                <span>-{formatCurrency(quotation.discountTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Estimated Tax</span>
                <span>+{formatCurrency(quotation.taxTotal)}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-base font-extrabold text-slate-900 dark:text-white">
                <span>Grand Total</span>
                <span className="text-blue-600 dark:text-blue-400">{formatCurrency(quotation.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table & Negotiation Form */}
        <form onSubmit={handleSubmitNegotiation} className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                Quotation Line Items
              </h3>
              {canAction && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-semibold">Global Counter Discount %:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 8"
                    value={overallDiscount}
                    onChange={(e) => setOverallDiscount(e.target.value)}
                    className="w-24 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-5 py-3">Product / Description</th>
                    <th className="px-5 py-3">Qty</th>
                    <th className="px-5 py-3">Unit Price</th>
                    <th className="px-5 py-3">Current Discount</th>
                    {canAction && <th className="px-5 py-3">Requested Discount %</th>}
                    <th className="px-5 py-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {quotation.lines.map((line) => (
                    <tr key={line.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{line.productName}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              line.lineType === "RECURRING"
                                ? "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300"
                                : "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                            }`}
                          >
                            {line.lineType === "RECURRING" ? "Recurring" : "One-Time"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">SKU: {line.sku}</div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                        {line.quantity}
                      </td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        {line.discountPercent}% ({formatCurrency(line.discountAmount)})
                      </td>
                      {canAction && (
                        <td className="px-5 py-4">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={lineDiscounts[line.id] ?? line.discountPercent}
                            onChange={(e) =>
                              setLineDiscounts({
                                ...lineDiscounts,
                                [line.id]: e.target.value,
                              })
                            }
                            className="w-20 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-5 py-4 text-right font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(line.finalUnitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Counter Negotiation Action Box */}
          {canAction && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Percent size={18} className="text-blue-500" />
                Submit Counter Negotiation
              </h3>
              <p className="text-xs text-slate-500">
                You can adjust individual line discounts above or enter an overall requested discount and message to submit to our sales team.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Negotiation Notes / Change Request Message
                </label>
                <textarea
                  rows={3}
                  value={negotiationComment}
                  onChange={(e) => setNegotiationComment(e.target.value)}
                  placeholder="Explain your requested changes or ask questions regarding pricing and delivery..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="submit"
                  disabled={submittingNegotiation}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2"
                >
                  {submittingNegotiation ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Negotiation...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Submit Negotiation Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Comment Timeline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-500" />
            Negotiation & Comment History
          </h3>

          {quotation.comments.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No comments or negotiation messages yet.</p>
          ) : (
            <div className="space-y-3">
              {quotation.comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    c.authorType === "CUSTOMER"
                      ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-slate-800 dark:text-slate-200 ml-4"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 mr-4"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          c.authorType === "CUSTOMER" ? "bg-blue-500" : "bg-emerald-500"
                        }`}
                      />
                      {c.authorType === "CUSTOMER" ? "You (Customer)" : "Sales Representative"}
                    </span>
                    <span>{new Date(c.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{c.comment}</p>
                  {c.isNegotiationCounter && (
                    <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      Proposed Counter Discount: {c.proposedDiscount}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick Comment Input */}
          <form onSubmit={handleAddComment} className="pt-2 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type a message or question..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={submittingComment || !newComment.trim()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors flex items-center space-x-1"
            >
              <Send size={14} />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
