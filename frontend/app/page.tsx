"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Navigation */}
      <nav className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-xl">🚀</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              DealFlow<span className="text-indigo-400">360</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-8">
          <span>✨ Feature 1 Complete</span>
          <span className="text-slate-600">•</span>
          <span>Authentication & Role-Based Access Control</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Intelligent Sales Operations Platform with <span className="text-indigo-400">Enterprise RBAC</span>
        </h1>

        <p className="mt-6 text-slate-400 text-base md:text-lg max-w-2xl leading-relaxed">
          Manage quotations, automated discount thresholds, multi-warehouse fulfillment, and hybrid billing cycles with precision.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 transition-all text-center"
          >
            Sign In to Platform
          </Link>
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition-all text-center"
          >
            Sales Rep Registration
          </Link>
        </div>

        {/* Feature Pill Highlights */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-medium text-slate-400">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            👑 ADMIN
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            💼 SALES_REP
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            📊 SALES_MANAGER
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            💳 FINANCE
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 col-span-2 md:col-span-1">
            🏬 CUSTOMER
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        © 2026 DealFlow360. All rights reserved.
      </footer>
    </div>
  );
}
