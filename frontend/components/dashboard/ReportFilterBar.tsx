"use client";

import React from "react";
import { Filter, Calendar, DollarSign, RefreshCw } from "lucide-react";

export interface FilterState {
  dateFrom?: string;
  dateTo?: string;
  customerTier?: string;
  currency?: string;
  quotationStatus?: string;
}

interface ReportFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onRefresh?: () => void;
  showTierFilter?: boolean;
  showStatusFilter?: boolean;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  filters,
  onFilterChange,
  onRefresh,
  showTierFilter = true,
  showStatusFilter = true,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mr-2">
          <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Filters:</span>
        </div>

        {/* Date From */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">From:</span>
          <input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) =>
              onFilterChange({ ...filters, dateFrom: e.target.value || undefined })
            }
            className="bg-transparent font-medium text-slate-900 dark:text-white outline-none"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">To:</span>
          <input
            type="date"
            value={filters.dateTo || ""}
            onChange={(e) =>
              onFilterChange({ ...filters, dateTo: e.target.value || undefined })
            }
            className="bg-transparent font-medium text-slate-900 dark:text-white outline-none"
          />
        </div>

        {/* Currency Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">Currency:</span>
          <select
            value={filters.currency || ""}
            onChange={(e) =>
              onFilterChange({ ...filters, currency: e.target.value || undefined })
            }
            className="bg-transparent font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="">All Currencies</option>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>

        {/* Customer Tier */}
        {showTierFilter && (
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500">Tier:</span>
            <select
              value={filters.customerTier || ""}
              onChange={(e) =>
                onFilterChange({ ...filters, customerTier: e.target.value || undefined })
              }
              className="bg-transparent font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="">All Tiers</option>
              <option value="BRONZE">Bronze</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
            </select>
          </div>
        )}

        {/* Quotation Status */}
        {showStatusFilter && (
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500">Status:</span>
            <select
              value={filters.quotationStatus || ""}
              onChange={(e) =>
                onFilterChange({ ...filters, quotationStatus: e.target.value || undefined })
              }
              className="bg-transparent font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT_TO_CUSTOMER">Sent To Customer</option>
              <option value="UNDER_NEGOTIATION">Under Negotiation</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      )}
    </div>
  );
};

export default ReportFilterBar;
