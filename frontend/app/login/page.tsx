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
  KeyRound,
  Check,
} from "lucide-react";
import { useAuth, UserRole } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";

type ViewState =
  | "login"
  | "2fa"
  | "forgot"
  | "reset-otp"
  | "new-password"
  | "reset-success";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Mode: 'login' | '2fa' | 'forgot' | 'reset-otp' | 'new-password' | 'reset-success'
  const [viewState, setViewState] = useState<ViewState>("login");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // OTP & Reset Password states
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // UI status state
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // --- FORGOT PASSWORD FLOW HANDLERS ---

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setGeneralError(null);
    setSuccessMsg(null);

    if (!email || !email.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post<{ message: string; email: string; devOtp?: string }>(
        "/auth/forgot-password",
        { email }
      );

      setIsSubmitting(false);
      if (res.data?.devOtp) {
        setDevOtp(res.data.devOtp);
      }
      setSuccessMsg(
        res.data?.message || "Password reset OTP code sent to your email!"
      );
      setViewState("reset-otp");
    } catch (err: any) {
      setIsSubmitting(false);
      setGeneralError(
        err.response?.data?.message || "Failed to send reset code. Please try again."
      );
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (otpCode.length < 6) {
      setGeneralError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/verify-reset-otp", {
        email,
        otp: otpCode,
      });

      setIsSubmitting(false);
      setGeneralError(null);
      setSuccessMsg("OTP Code verified! Enter your new password below.");
      setViewState("new-password");
    } catch (err: any) {
      setIsSubmitting(false);
      setGeneralError(
        err.response?.data?.message || "Invalid OTP code. Please check and try again."
      );
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!newPassword || newPassword.length < 6) {
      setGeneralError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setGeneralError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/reset-password", {
        email,
        otp: otpCode,
        newPassword,
      });

      setIsSubmitting(false);
      setViewState("reset-success");
    } catch (err: any) {
      setIsSubmitting(false);
      setGeneralError(
        err.response?.data?.message || "Failed to reset password. Please try again."
      );
    }
  };

  const resetToLogin = () => {
    setViewState("login");
    setGeneralError(null);
    setSuccessMsg(null);
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-[440px] bg-white rounded-2xl border border-slate-200 shadow-xl p-7 sm:p-9 transition-all duration-300">
        
        {/* 1. STANDARD LOGIN VIEW */}
        {viewState === "login" && (
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

                {/* FORGOT PASSWORD CLICKABLE LINK */}
                <button
                  type="button"
                  onClick={() => {
                    setViewState("forgot");
                    setGeneralError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[#007FFF] hover:underline font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all duration-200 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
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
        )}

        {/* 2. FORGOT PASSWORD VIEW (ENTER EMAIL) */}
        {viewState === "forgot" && (
          <div>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#007FFF] border border-blue-100 flex items-center justify-center mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Reset Password
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                Enter your registered email address and we&apos;ll send you a 6-digit security OTP code to reset your password.
              </p>
            </div>

            {generalError && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all duration-200 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={resetToLogin}
                className="text-xs sm:text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
              >
                ← Back to login
              </button>
            </div>
          </div>
        )}

        {/* 3. RESET OTP VERIFICATION VIEW */}
        {viewState === "reset-otp" && (
          <div>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#007FFF] border border-blue-100 flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Enter Security Code
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Enter the 6-digit code sent to your email
              </p>

              <div className="bg-blue-50 text-[#007FFF] font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 mt-3 border border-blue-100">
                <Mail className="w-3.5 h-3.5" />
                <span>{email}</span>
              </div>
            </div>

            {devOtp && (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center font-mono">
                ⚡ Demo Mode Code: <strong>{devOtp}</strong>
              </div>
            )}

            {generalError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyResetOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 text-center mb-2">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setOtpCode(val);
                    if (generalError) setGeneralError(null);
                  }}
                  placeholder="000000"
                  className="w-full h-14 text-center text-2xl font-bold tracking-[12px] bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-[#007FFF] focus:ring-4 focus:ring-blue-500/15 focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otpCode.length < 6}
                className="w-full bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all duration-200 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={resetToLogin}
                className="text-xs sm:text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
              >
                ← Back to login
              </button>
            </div>
          </div>
        )}

        {/* 4. NEW PASSWORD VIEW */}
        {viewState === "new-password" && (
          <div>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#007FFF] border border-blue-100 flex items-center justify-center mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Create New Password
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Set a strong password for your account
              </p>
            </div>

            {generalError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#007FFF] focus:ring-4 focus:ring-blue-500/15 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-300 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#007FFF] focus:ring-4 focus:ring-blue-500/15 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newPassword || !confirmPassword}
                className="w-full bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all duration-200 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={resetToLogin}
                className="text-xs sm:text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
              >
                ← Back to login
              </button>
            </div>
          </div>
        )}

        {/* 5. RESET SUCCESS VIEW */}
        {viewState === "reset-success" && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Password Reset Complete!
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
              Your password for <strong>{email}</strong> has been successfully updated. You can now log in with your new password.
            </p>

            <button
              type="button"
              onClick={resetToLogin}
              className="w-full bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all duration-200 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              <span>Back to Log In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
