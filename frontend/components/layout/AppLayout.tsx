"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Role-based route enforcement
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      redirectUserToDashboard(role);
    } else if (pathname.startsWith("/sales") && role !== "SALES_REP") {
      redirectUserToDashboard(role);
    } else if (pathname.startsWith("/manager") && role !== "SALES_MANAGER") {
      redirectUserToDashboard(role);
    } else if (pathname.startsWith("/finance") && role !== "FINANCE") {
      redirectUserToDashboard(role);
    } else if (pathname.startsWith("/portal") && role !== "CUSTOMER" && role !== "ADMIN" && role !== "SALES_REP") {
      redirectUserToDashboard(role);
    }
  }, [user, role, isLoading, pathname, router]);

  const redirectUserToDashboard = (currentRole: string | null) => {
    switch (currentRole) {
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
        router.push("/login");
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0D69B2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Verifying Access & Loading Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Desktop & Mobile Sidebar */}
      <div className={`${mobileOpen ? "block" : "max-lg:hidden"}`}>
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Floating Header */}
      <Header
        sidebarCollapsed={collapsed}
        onMobileMenuToggle={() => setMobileOpen(!mobileOpen)}
      />

      {/* Main Content Area */}
      <main
        className={`transition-all duration-300 pt-20 md:pt-24 pb-10 px-4 md:px-8 ${
          collapsed ? "lg:pl-[92px]" : "lg:pl-[284px]"
        }`}
      >
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
