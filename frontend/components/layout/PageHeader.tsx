"use client";

import React from "react";

interface PageHeaderProps {
  badgeText?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export default function PageHeader({
  badgeText = "Live Overview",
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-900/50 dark:to-slate-900 p-6 shadow-sm mb-6">
      {/* Glow highlight background blur */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#0D69B2]/10 dark:bg-[#0D69B2]/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          {badgeText && (
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(13,105,178,0.08)] dark:bg-[#0D69B2]/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0D69B2] dark:text-blue-400 border border-[#0D69B2]/15">
              <span className="pulsing-dot" />
              {badgeText}
            </div>
          )}

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            {description}
          </p>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
