"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Phone,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import AuthBackgroundSlider from "@/components/auth/AuthBackgroundSlider";
import { useAuth } from "@/context/auth-context";

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", country: "IN" },
  { code: "+1", flag: "🇺🇸", country: "US" },
  { code: "+44", flag: "🇬🇧", country: "GB" },
  { code: "+1", flag: "🇨🇦", country: "CA" },
  { code: "+61", flag: "🇦🇺", country: "AU" },
  { code: "+971", flag: "🇦🇪", country: "AE" },
  { code: "+49", flag: "🇩🇪", country: "DE" },
  { code: "+65", flag: "🇸🇬", country: "SG" },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  // Mode: 'form' | 'sent'
  const [viewState, setViewState] = useState<"form" | "sent">("form");

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState("+91");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setGeneralError("Please enter both First Name and Last Name.");
      return;
    }
    if (!email || !email.includes("@")) {
      setGeneralError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setGeneralError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setGeneralError("Passwords do not match. Please check again.");
      return;
    }

    setIsSubmitting(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    try {
      const result = await signup(fullName, email, password);

      if (result.success) {
        setIsSubmitting(false);
        setViewState("sent");
      } else {
        setGeneralError(
          result.error || "Registration failed. Email may already be registered."
        );
        setIsSubmitting(false);
      }
    } catch {
      setGeneralError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans">
      {/* Background Slider */}
      <AuthBackgroundSlider />

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-7 sm:p-9 transition-all duration-300">
        {viewState === "form" ? (
          /* REGISTRATION FORM VIEW */
          <div>
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#007FFF] to-blue-400 p-0.5 shadow-md shadow-blue-500/20 mb-3 flex items-center justify-center">
                <img
                  src="/img.png"
                  alt="Logo"
                  className="w-full h-full object-cover rounded-2xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <span className="text-white text-xl font-extrabold tracking-tight">
                  DF
                </span>
              </div>
              <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
                Create an Account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Sign up to get started with your workspace
              </p>
            </div>

            {/* Error Notification */}
            {generalError && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{generalError}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              {/* First Name & Last Name Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      required
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-300 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                  />
                </div>
              </div>

              {/* Mobile Number with Country Dial Code */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Mobile Number
                </label>
                <div className="grid grid-cols-[105px_1fr] gap-2">
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-3 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#007FFF] cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c, i) => (
                      <option key={i} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all duration-200 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Sign Up</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-7 pt-6 border-t border-slate-200/90 text-center">
              <p className="text-xs sm:text-sm text-slate-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-[#007FFF] font-semibold hover:underline"
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* VERIFICATION LINK SENT VIEW */
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#007FFF] border border-blue-100 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Verify Your Email
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
              We have sent a verification link to your email address:
            </p>

            <div className="bg-slate-100 text-slate-800 font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm inline-block my-4 border border-slate-200">
              {email || "your-email@company.com"}
            </div>

            <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
              Please click the link in the email to activate your account and access your workspace.
            </p>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full bg-[#007FFF] hover:bg-[#0066CC] text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Back to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
