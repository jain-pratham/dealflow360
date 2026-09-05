"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Eye,
  Edit2,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
}

export interface ActionOption<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  variant?: "default" | "danger" | "primary" | "warning";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  customActions?: (row: T) => ActionOption<T>[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  showPagination?: boolean;
}

function ActionDropdown<T extends { id?: string | number }>({
  row,
  onView,
  onEdit,
  onDelete,
  customActions,
}: {
  row: T;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  customActions?: (row: T) => ActionOption<T>[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const extraActions = customActions ? customActions(row) : [];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
          isOpen
            ? "bg-[#0D69B2] text-white border-[#0D69B2] shadow-xs"
            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
        }`}
        title="Actions"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {onView && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onView(row);
              }}
              className="flex items-center gap-2 w-full px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-[#0D69B2] dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
            >
              <Eye size={14} className="text-[#0D69B2]" />
              <span>View Details</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onEdit(row);
              }}
              className="flex items-center gap-2 w-full px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-[#F4882E] dark:hover:text-orange-400 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 size={14} className="text-[#F4882E]" />
              <span>Edit Record</span>
            </button>
          )}

          {extraActions.map((act, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                act.onClick(row);
              }}
              className={`flex items-center gap-2 w-full px-2.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                act.variant === "danger"
                  ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                  : act.variant === "primary"
                  ? "text-[#0D69B2] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  : act.variant === "warning"
                  ? "text-[#F4882E] dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {act.icon}
              <span>{act.label}</span>
            </button>
          ))}

          {onDelete && (
            <>
              {(onView || onEdit || extraActions.length > 0) && (
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onDelete(row);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={14} className="text-red-500" />
                <span>Delete Record</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  onView,
  onEdit,
  onDelete,
  customActions,
  onRowClick,
  emptyMessage = "No data records found.",
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  showPagination = true,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  // Reset to page 1 whenever total data length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Ensure current page stays within range
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedData = useMemo(() => {
    if (!showPagination) return data;
    return data.slice(startIndex, endIndex);
  }, [data, startIndex, endIndex, showPagination]);

  const handleRowClick = (row: T, e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("a")
    ) {
      return;
    }
    if (onRowClick) {
      onRowClick(row);
    } else if (onView) {
      onView(row);
    }
  };

  const hasActions = onView || onEdit || onDelete || customActions;

  // Generate page number pills around current page
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, safeCurrentPage - 1);
      let end = Math.min(totalPages, safeCurrentPage + 1);

      if (safeCurrentPage <= 2) {
        end = 3;
      } else if (safeCurrentPage >= totalPages - 1) {
        start = totalPages - 2;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto min-h-[220px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ${
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {col.header}
                </th>
              ))}
              {hasActions && (
                <th className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right w-16">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="px-4 py-12 text-center text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rIdx) => (
                <tr
                  key={row.id ?? rIdx}
                  onClick={(e) => handleRowClick(row, e)}
                  className={`hover:bg-[#0D69B2]/5 transition-colors duration-150 group ${
                    onRowClick || onView ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className={`px-4 py-3.5 text-xs md:text-sm text-slate-800 dark:text-slate-200 font-medium ${
                        col.align === "center"
                          ? "text-center"
                          : col.align === "right"
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {col.render
                        ? col.render(row)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? "")
                        : null}
                    </td>
                  ))}

                  {hasActions && (
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <ActionDropdown
                        row={row}
                        onView={onView}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        customActions={customActions}
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION FOOTER BAR */}
      {showPagination && totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Entries Counter */}
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Showing <span className="font-extrabold text-slate-800 dark:text-slate-200">{totalItems === 0 ? 0 : startIndex + 1}</span> to{" "}
            <span className="font-extrabold text-slate-800 dark:text-slate-200">{endIndex}</span> of{" "}
            <span className="font-extrabold text-[#0D69B2]">{totalItems}</span> entries
          </div>

          {/* Rows Per Page Selector & Page Number Controls */}
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] shadow-2xs cursor-pointer"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Buttons */}
            <div className="flex items-center gap-1">
              {/* First Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft size={14} />
              </button>

              {/* Prev Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page Number Pills */}
              {getPageNumbers().map((pg, i) => (
                <React.Fragment key={i}>
                  {pg === "..." ? (
                    <span className="px-2 py-1 text-xs text-slate-400 font-bold">...</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Number(pg))}
                      className={`min-w-[28px] h-7 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        safeCurrentPage === pg
                          ? "bg-[#0D69B2] text-white border-[#0D69B2] shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {pg}
                    </button>
                  )}
                </React.Fragment>
              ))}

              {/* Next Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight size={14} />
              </button>

              {/* Last Page Button */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({
  type,
  label,
}: {
  type: "success" | "warning" | "primary" | "danger" | "info";
  label: string;
}) {
  const styles = {
    success:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
    warning:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20",
    primary:
      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20",
    danger:
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20",
    info:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[type]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          type === "success"
            ? "bg-emerald-500"
            : type === "warning"
            ? "bg-amber-500"
            : type === "primary"
            ? "bg-[#0D69B2]"
            : type === "danger"
            ? "bg-red-500"
            : "bg-slate-400"
        }`}
      />
      {label}
    </span>
  );
}
