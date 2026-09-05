"use client";

import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { Sparkles, Plus, Trash2, ShieldAlert, CheckCircle2 } from "lucide-react";

interface QuoteLine {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage
}

export default function NewQuotationPage() {
  const [lines, setLines] = useState<QuoteLine[]>([
    { id: "1", productName: "Enterprise Server X1", quantity: 2, unitPrice: 12500, discount: 10 },
    { id: "2", productName: "Cloud Management Suite", quantity: 1, unitPrice: 4500, discount: 5 },
  ]);

  // Calculations
  const calculateSubtotal = (line: QuoteLine) => line.quantity * line.unitPrice * (1 - line.discount / 100);
  const totalAmount = lines.reduce((acc, line) => acc + calculateSubtotal(line), 0);
  const estimatedCost = lines.reduce((acc, line) => acc + line.quantity * (line.unitPrice * 0.65), 0);
  const marginPercent = totalAmount > 0 ? (((totalAmount - estimatedCost) / totalAmount) * 100).toFixed(1) : "0.0";

  const addLine = () => {
    setLines([
      ...lines,
      { id: Date.now().toString(), productName: "Implementation & Setup Service", quantity: 1, unitPrice: 3200, discount: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  return (
    <AppLayout>
      <PageHeader
        badgeText="Quotation Builder"
        title="Create New Commercial Proposal"
        description="Configure deal items, apply customer discounts, view real-time margin health, and explore upsell recommendations."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Quotation Builder Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white">Quotation Line Items</h3>
              <button
                onClick={addLine}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D69B2] hover:text-[#0b5a99] cursor-pointer"
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-bold text-slate-900 dark:text-white">{line.productName}</div>
                    <div className="text-xs text-slate-500">${line.unitPrice.toLocaleString()} / unit</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Qty</span>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setLines(lines.map((l) => (l.id === line.id ? { ...l, quantity: val } : l)));
                        }}
                        className="w-16 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Discount %</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={line.discount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setLines(lines.map((l) => (l.id === line.id ? { ...l, discount: val } : l)));
                        }}
                        className="w-16 px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-amber-600 font-bold"
                      />
                    </div>

                    <div className="text-right min-w-[90px]">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtotal</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        ${calculateSubtotal(line).toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => removeLine(line.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary & Margin Indicator */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Margin Health Indicator</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{marginPercent}% Margin</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Healthy</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total Quotation Value</span>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">${totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upsell / Cross-sell Panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#EC2091]" />
              <h3 className="font-extrabold text-slate-900 dark:text-white">Recommended Upsells</h3>
            </div>
            <p className="text-xs text-slate-500">Suggested add-ons with high co-purchase scores for current deal items.</p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">24/7 Premium Support Package</span>
                  <span className="text-[10px] font-bold text-[#0D69B2]">95% Match</span>
                </div>
                <div className="text-xs text-slate-500">+$2,400.00 / yr</div>
                <button
                  onClick={addLine}
                  className="w-full py-1.5 rounded-lg text-xs font-bold bg-[#0D69B2]/10 hover:bg-[#0D69B2]/20 text-[#0D69B2] transition-colors cursor-pointer"
                >
                  + Add to Quote
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">Redundant Power Supply Unit</span>
                  <span className="text-[10px] font-bold text-[#0D69B2]">88% Match</span>
                </div>
                <div className="text-xs text-slate-500">+$650.00</div>
                <button
                  onClick={addLine}
                  className="w-full py-1.5 rounded-lg text-xs font-bold bg-[#0D69B2]/10 hover:bg-[#0D69B2]/20 text-[#0D69B2] transition-colors cursor-pointer"
                >
                  + Add to Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
