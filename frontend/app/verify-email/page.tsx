"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import AuthBackgroundSlider from "@/components/auth/AuthBackgroundSlider";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyEmailToken } = useAuth();

  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token was provided in the link.");
      return;
    }

    let isMounted = true;

    async function executeVerification() {
      try {
        const result = await verifyEmailToken(token as string);
        if (isMounted) {
          if (result.success) {
            setStatus("success");
          } else {
            setStatus("error");
            setErrorMessage(result.error || "Invalid or expired verification token.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus("error");
          setErrorMessage("An unexpected error occurred during verification.");
        }
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, verifyEmailToken]);

  return (
    <div className="relative z-10 w-full max-w-[460px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-7 sm:p-9 text-center transition-all duration-300">
      {status === "loading" && (
        <div className="py-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#007FFF] border border-blue-100 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Verifying Your Email...
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xs mx-auto">
            Please wait while we confirm your email verification token.
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="py-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Email Verified Successfully!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
            Your DealFlow360 account email has been verified. You now have full access to all workspace features.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full mt-6 bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="py-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Verification Failed
          </h2>
          <p className="text-xs sm:text-sm text-rose-600 mt-2 max-w-xs mx-auto leading-relaxed font-medium">
            {errorMessage}
          </p>
          <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
            The verification token may have expired or already been used.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full mt-6 bg-slate-900 hover:bg-slate-800 transition-all text-white font-semibold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            <span>Back to Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans">
      <AuthBackgroundSlider />
      <Suspense
        fallback={
          <div className="relative z-10 w-full max-w-[460px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-9 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#007FFF] mx-auto" />
            <p className="text-sm text-slate-500 mt-3">Loading page...</p>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
