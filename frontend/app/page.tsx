"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      switch (user.role) {
        case "ADMIN":
          router.replace("/admin/dashboard");
          break;
        case "SALES_REP":
          router.replace("/sales/dashboard");
          break;
        case "SALES_MANAGER":
          router.replace("/manager/dashboard");
          break;
        case "FINANCE":
          router.replace("/finance/dashboard");
          break;
        case "CUSTOMER":
          router.replace("/portal");
          break;
        default:
          router.replace("/sales/dashboard");
      }
    } else {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span className="text-sm font-medium text-slate-400">Loading DealFlow360...</span>
      </div>
    </div>
  );
}


