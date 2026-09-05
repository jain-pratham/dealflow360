"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<{ email: string; customerName: string } | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invitation or setup token is missing from URL.");
      setValidating(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await apiClient.get(`/auth/customer/verify-token?token=${token}`);
        if (res.error || !res.data?.valid) {
          setError(res.error || "Invalid or expired activation link.");
        } else {
          setCustomerInfo({
            email: res.data.email,
            customerName: res.data.customerName,
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to validate activation token.");
      } finally {
        setValidating(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await apiClient.post("/auth/customer/activate", {
        token,
        password,
      });

      if (res.error) {
        setError(res.error);
        setSubmitting(false);
      } else {
        setSuccess(true);
        if (res.data?.accessToken) {
          apiClient.setAccessToken(res.data.accessToken);
        }
        setTimeout(() => {
          router.push("/portal/quotations");
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during account activation.");
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-400">Validating your invitation token...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Activate Your Account</h2>
          <p className="text-sm text-slate-400">
            {customerInfo?.customerName ? `Welcome ${customerInfo.customerName}! ` : ""}
            Set your secure password to access your DealFlow360 Customer Portal.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3 text-red-400 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center space-y-3">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto animate-bounce" />
            <h3 className="text-lg font-semibold text-emerald-300">Account Activated!</h3>
            <p className="text-xs text-slate-300">Redirecting to your customer quotations portal...</p>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Registered Email
              </label>
              <input
                type="email"
                value={customerInfo?.email || ""}
                disabled
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/60 rounded-xl text-slate-300 font-medium text-sm focus:outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter new password"
                  className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition duration-150 shadow-lg shadow-blue-600/25 flex items-center justify-center space-x-2 text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Activating Account...</span>
                </>
              ) : (
                <span>Activate & View Quotation</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <ActivateContent />
    </Suspense>
  );
}
