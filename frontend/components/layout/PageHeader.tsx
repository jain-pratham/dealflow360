"use client";

import React from "react";
import {
  Sparkles,
  ShieldCheck,
  BarChart3,
  FileText,
  DollarSign,
  Package,
  CheckCircle2,
  Users,
  Settings,
  Warehouse,
  LucideIcon,
} from "lucide-react";

interface PageHeaderProps {
  badgeText?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

function getDefaultIcon(badgeText?: string, title?: string): LucideIcon {
  const text = `${badgeText || ""} ${title || ""}`.toLowerCase();
  if (text.includes("admin") || text.includes("role") || text.includes("user")) return ShieldCheck;
  if (text.includes("report") || text.includes("analytic") || text.includes("health")) return BarChart3;
  if (text.includes("quote") || text.includes("proposal")) return FileText;
  if (text.includes("price") || text.includes("discount") || text.includes("bill") || text.includes("finance") || text.includes("subscription") || text.includes("credit")) return DollarSign;
  if (text.includes("inventory") || text.includes("stock") || text.includes("fulfillment") || text.includes("backorder")) return Package;
  if (text.includes("warehouse")) return Warehouse;
  if (text.includes("approval") || text.includes("chain")) return CheckCircle2;
  if (text.includes("customer")) return Users;
  if (text.includes("setting")) return Settings;
  return Sparkles;
}

export default function PageHeader({
  badgeText = "Live Overview",
  icon: CustomIcon,
  title,
  description,
  actions,
}: PageHeaderProps) {
  const Icon = CustomIcon || getDefaultIcon(badgeText, title);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-900/50 dark:to-slate-900 px-5 py-3.5 md:py-4 shadow-sm mb-5">
      {/* Glow highlight background blur */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#0D69B2]/10 dark:bg-[#0D69B2]/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          {badgeText && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(13,105,178,0.08)] dark:bg-[#0D69B2]/20 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#0D69B2] dark:text-blue-400 border border-[#0D69B2]/15">
              {Icon && <Icon className="w-3.5 h-3.5 text-[#0D69B2] dark:text-blue-400 shrink-0" />}
              {badgeText}
            </div>
          )}

          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            {description}
          </p>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 mt-1 md:mt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}


