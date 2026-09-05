"use client";

import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/DataTable";
import { MessageSquare, CheckCircle2, Send, CornerDownRight } from "lucide-react";

export default function CustomerQuotationDetailPage() {
  const [status, setStatus] = useState<"Sent" | "Under Negotiation" | "Confirmed">("Under Negotiation");
  const [proposedDiscount, setProposedDiscount] = useState<number>(8);
  const [commentText, setCommentText] = useState<string>("");
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; time: string }>>([
    { id: "1", author: "Sales Representative", text: "Here is your formal quote for the Enterprise Server X1 & Cloud Suite.", time: "Sep 4, 10:00 AM" },
    { id: "2", author: "Customer (You)", text: "Could we explore an additional 3% discount for volume hardware?", time: "Sep 4, 02:30 PM" },
  ]);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    setComments([
      ...comments,
      { id: Date.now().toString(), author: "Customer (You)", text: commentText, time: "Just now" },
    ]);
    setCommentText("");
  };

  const handleConfirmQuotation = () => {
    setStatus("Confirmed");
    alert("Quotation successfully confirmed! Order is now being dispatched to fulfillment.");
  };

  return (
    <AppLayout>
      <PageHeader
        badgeText="Quotation Review"
        title="Quotation #Q-2026-003 Details"
        description="Review commercial terms, post line-level comments, submit counter proposals, or confirm final terms."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge type={status === "Confirmed" ? "success" : "warning"} label={status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quotation Details & Counter Offer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white">Proposal Line Items</h3>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">Enterprise Server X1</div>
                  <div className="text-slate-500">2 Units @ $12,500.00 each (10% Sales Discount)</div>
                </div>
                <div className="font-extrabold text-slate-900 dark:text-white text-sm">$22,500.00</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">Cloud Management Suite</div>
                  <div className="text-slate-500">1 License @ $4,500.00 / yr (5% Discount)</div>
                </div>
                <div className="font-extrabold text-slate-900 dark:text-white text-sm">$4,275.00</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Agreed Amount</span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">$26,775.00</span>
            </div>
          </div>

          {/* Counter Discount Proposal & Change Requests */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white">Counter Discount Proposal & Change Request</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Proposed Counter Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={proposedDiscount}
                  onChange={(e) => setProposedDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => alert(`Counter proposal of ${proposedDiscount}% submitted to Sales Manager for review!`)}
                  className="w-full py-2.5 rounded-xl font-bold bg-[#F4882E] hover:bg-[#e07722] text-white transition-all cursor-pointer shadow-md shadow-orange-500/20"
                >
                  Submit Counter Offer
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleConfirmQuotation}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 size={18} /> Confirm Final Terms & Accept Quote
              </button>
            </div>
          </div>
        </div>

        {/* Line-Level Comments Thread */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-[#0D69B2]" />
              <h3 className="font-extrabold text-slate-900 dark:text-white">Negotiation Comments</h3>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {comments.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>{c.author}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{c.time}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{c.text}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <textarea
                rows={2}
                placeholder="Ask line-level questions or request term changes..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-[#0D69B2]/20"
              />
              <button
                onClick={handleAddComment}
                className="w-full py-2 rounded-xl text-xs font-bold bg-[#0D69B2] hover:bg-[#0b5a99] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send size={14} /> Send Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
