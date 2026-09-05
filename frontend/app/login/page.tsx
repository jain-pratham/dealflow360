"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import AuthBackgroundSlider from "@/components/auth/AuthBackgroundSlider";
import { useAuth, UserRole } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Mode: 'login' | '2fa'
  const [viewState, setViewState] = useState<"login" | "2fa">("login");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  // UI state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);

  const getRoleDashboard = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return "/admin/dashboard";
      case "SALES_REP":
        return "/sales/dashboard";
      case "SALES_MANAGER":
        return "/manager/dashboard";
      case "FINANCE":
        return "/finance/dashboard";
      case "CUSTOMER":
        return "/portal";
      default:
        return "/sales/dashboard";
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    let hasError = false;
    if (!email || !email.includes("@")) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    }
    if (!password) {
      setPasswordError("Please enter your password.");
      hasError = true;
    }

    if (hasError) return;

    setIsSubmitting(true);
    try {
      const result = await login(email, password);

      if (result.success && result.role) {
        // If account requires 2FA or success
        const destination = getRoleDashboard(result.role);
        router.push(destination);
      } else {
        setGeneralError(
          result.error || "Invalid login credentials. Please try again."
        );
        setIsSubmitting(false);
      }
    } catch {
      setGeneralError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (otpCode.length < 6) {
      setGeneralError("Please enter a complete 6-digit OTP code.");
      return;
    }

    setIsSubmitting(true);
    // Simulate 2FA OTP verification delay
    setTimeout(() => {
      setIsSubmitting(false);
      setOtpSuccessMsg("2FA verified successfully! Redirecting...");
      setTimeout(() => {
        router.push("/sales/dashboard");
      }, 1000);
    }, 1200);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-[430px] bg-white rounded-2xl border border-slate-200 shadow-xl p-7 sm:p-9 transition-all duration-300">
        {viewState === "login" ? (
          /* STANDARD LOGIN VIEW */
          <div>
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-7">
              <div className="mb-3.5 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-12 sm:h-14 w-auto max-w-[240px] object-contain"
                />
              </div>
              <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter your credentials to access your account
              </p>
            </div>

            {/* Error Notification */}
            {generalError && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Login Form */}
            <form noValidate onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder="name@company.com"
                    required
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                      emailError
                        ? "border-rose-400 focus:ring-rose-500/15 focus:border-rose-500"
                        : "border-slate-300 focus:ring-blue-500/15 focus:border-[#007FFF]"
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-rose-600 font-medium mt-1">
                    {emailError}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    placeholder="••••••••"
                    required
                    className={`w-full pl-10 pr-11 py-3 rounded-xl border bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                      passwordError
                        ? "border-rose-400 focus:ring-rose-500/15 focus:border-rose-500"
                        : "border-slate-300 focus:ring-blue-500/15 focus:border-[#007FFF]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-rose-600 font-medium mt-1">
                    {passwordError}
                  </p>
                )}
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between pt-1 text-xs sm:text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#007FFF] focus:ring-[#007FFF] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    setGeneralError(
                      "Password reset instructions have been sent if account exists."
                    );
                  }}
                  className="text-[#007FFF] hover:underline font-semibold"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all duration-200 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Logging In...</span>
                  </>
                ) : (
                  <>
                    <span>Log In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick 2FA Switcher (Demo Feature) */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setViewState("2fa");
                  setGeneralError(null);
                }}
                className="text-xs text-slate-400 hover:text-[#007FFF] transition-colors"
              >
                Test 2FA OTP View →
              </button>
            </div>

            {/* Footer Divider */}
            <div className="mt-7 pt-6 border-t border-slate-200/90 text-center">
              <p className="text-xs sm:text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="text-[#007FFF] font-semibold hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* 2FA OTP VERIFICATION VIEW */
          <div>
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#007FFF] border border-blue-100 flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold tracking-widest text-[#007FFF] uppercase bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100/80 mb-2 inline-block">
                SECURITY CHECK
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Two-Factor Authentication
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter the verification code sent to your registered email
              </p>

              {/* Email Badge */}
              <div className="bg-slate-100 text-slate-700 font-medium px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 mt-3">
                <Mail className="w-3.5 h-3.5 text-[#007FFF]" />
                <span>{email || "user@workspace.com"}</span>
              </div>
            </div>

            {/* OTP Status Messages */}
            {generalError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{generalError}</span>
              </div>
            )}
            {otpSuccessMsg && (
              <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{otpSuccessMsg}</span>
              </div>
            )}

            {/* OTP Form */}
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 text-center mb-2">
                  6-Digit Security Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setOtpCode(val);
                  }}
                  placeholder="000000"
                  className="w-full h-14 text-center text-2xl font-bold tracking-[12px] bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-[#007FFF] focus:ring-4 focus:ring-blue-500/15 focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otpCode.length < 6}
                className="w-full bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all duration-200 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Actions / Back Link */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setViewState("login");
                  setGeneralError(null);
                }}
                className="text-xs sm:text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors"
              >
                ← Back to login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
