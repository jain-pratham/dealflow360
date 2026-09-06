"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SalesPipelineRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sales/quotations");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-xs font-semibold text-slate-500">Redirecting to Quotations...</p>
    </div>
  );
}
