"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      switch (user.role) {
        case "ADMIN":
          router.push("/admin/dashboard");
          break;
        case "SALES_REP":
          router.push("/sales/dashboard");
          break;
        case "SALES_MANAGER":
          router.push("/manager/dashboard");
          break;
        case "FINANCE":
          router.push("/finance/dashboard");
          break;
        case "CUSTOMER":
          router.push("/portal");
          break;
        default:
          router.push("/sales/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Top Navbar */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0D69B2] to-[#EC2091] flex items-center justify-center font-extrabold text-white text-lg shadow-md">
              DF
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              DEALFLOW<span className="text-[#F4882E]">360</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-xs font-bold px-5 py-2.5 rounded-xl bg-[#0D69B2] hover:bg-[#0b5a99] text-white shadow-md shadow-blue-500/20 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(13,105,178,0.08)] dark:bg-[#0D69B2]/20 border border-[#0D69B2]/20 text-[#0D69B2] dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-8">
          <Sparkles size={14} className="text-[#F4882E]" />
          <span>Enterprise CRM & Operations Engine</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl leading-tight">
          Next-Generation Sales Operations & <span className="text-[#0D69B2]">Approval Automation</span>
        </h1>

        <p className="mt-6 text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl leading-relaxed">
          Manage quotations, automated discount thresholds, multi-warehouse fulfillment, and hybrid billing cycles with precision.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all text-center flex items-center justify-center gap-2"
          >
            Sign In to Dashboard <ArrowRight size={16} />
          </Link>
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-sm transition-all text-center"
          >
            Create Sales Account
          </Link>
        </div>

        {/* Feature Role Pills */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            👑 ADMIN
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            💼 SALES_REP
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            📊 SALES_MANAGER
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            💳 FINANCE
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 md:col-span-1">
            🏬 CUSTOMER
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 font-medium">
        © 2026 DealFlow360 Enterprise CRM. All rights reserved.
      </footer>
    </div>
  );
}

