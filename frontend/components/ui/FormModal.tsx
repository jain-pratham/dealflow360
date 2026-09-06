"use client";

import React from "react";
import { X, AlertCircle } from "lucide-react";

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  loading?: boolean;
}

export function FormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onSubmit,
  submitText = "Save Changes",
  loading = false,
}: FormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0D69B2] text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0">
              1
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const formEl = e.currentTarget;
            onSubmit?.(e);
            setTimeout(() => {
              const errEl = formEl
                ? formEl.querySelector(".border-red-500, .text-red-500")
                : document.querySelector(".border-red-500, .text-red-500");
              if (errEl) {
                errEl.scrollIntoView({ behavior: "smooth", block: "center" });
                errEl.classList.add("animate-error-glow");
                setTimeout(() => errEl.classList.remove("animate-error-glow"), 800);
                if (errEl instanceof HTMLInputElement || errEl instanceof HTMLSelectElement) {
                  errEl.focus({ preventScroll: true });
                }
              }
            }, 50);
          }}
          className="space-y-5"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{children}</div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl px-4 py-2.5 text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            {onSubmit && (
              <button
                type="submit"
                disabled={loading}
                className="bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-extrabold rounded-xl px-5 py-2.5 text-xs shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Processing..." : submitText}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export function FormField({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] font-semibold text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={12} className="shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium focus:border-[#0D69B2] focus:ring-2 focus:ring-[#0D69B2]/15 shadow-2xs ${
        props.className || ""
      }`}
    />
  );
}

export function PhoneInput({
  countryCode = "IN +91",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { countryCode?: string }) {
  return (
    <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 overflow-hidden shadow-2xs focus-within:border-[#0D69B2] focus-within:ring-2 focus-within:ring-[#0D69B2]/15 transition-all">
      <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-600 dark:text-slate-400 shrink-0 select-none">
        {countryCode}
      </span>
      <input
        {...props}
        className={`w-full bg-transparent px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 placeholder:font-medium ${
          props.className || ""
        }`}
      />
    </div>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none transition-all focus:border-[#0D69B2] focus:ring-2 focus:ring-[#0D69B2]/15 shadow-2xs ${
        props.className || ""
      }`}
    >
      {props.children}
    </select>
  );
}
