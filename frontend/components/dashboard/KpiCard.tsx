"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger" | "info";
  loading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  variant = "default",
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs animate-pulse">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
        <div className="h-3 w-40 bg-slate-100 dark:bg-slate-800/60 rounded" />
      </div>
    );
  }

  const borderVariantMap = {
    default: "border-slate-200 dark:border-slate-800",
    success: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10",
    warning: "border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10",
    danger: "border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10",
    info: "border-sky-200 dark:border-sky-900/50 bg-sky-50/20 dark:bg-sky-950/10",
  };

  const iconColorMap = {
    default: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800",
    success: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50",
    danger: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50",
    info: "text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/50",
  };

  return (
    <div
      className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border ${borderVariantMap[variant]} shadow-xs transition-all duration-200 hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </p>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${iconColorMap[variant]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </h3>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-400"
            }`}
          >
            {trend.isPositive ? "+" : ""}{trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default KpiCard;
