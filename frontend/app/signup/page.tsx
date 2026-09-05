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
  ArrowLeft,
  Phone,
  CheckCircle2,
  Check,
  Loader2,
  AlertCircle,
  MapPin,
  Calendar,
  Heart,
  Globe,
  Building,
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

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "United Arab Emirates",
  "Germany",
  "Singapore",
  "Other",
];

const STEPS = [
  { id: 1, name: "Personal Information" },
  { id: 2, name: "Contact Information" },
  { id: 3, name: "Address Information" },
  { id: 4, name: "Security & Verification" },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  // Stepper state (1: Personal, 2: Contact, 3: Address, 4: Security & Verification)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Step 1: Personal Information
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");

  // Step 2: Contact Information
  const [email, setEmail] = useState("");
  const [dialCode, setDialCode] = useState("+91");
  const [mobileNumber, setMobileNumber] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");

  // Step 3: Address Information
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");

  // Step 4: Security (Password & Confirm Password)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI status
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate Step 1
  const validateStep1 = (): boolean => {
    if (!firstName.trim()) {
      setGeneralError("Please enter your First Name.");
      return false;
    }
    if (!lastName.trim()) {
      setGeneralError("Please enter your Last Name.");
      return false;
    }
    if (!dob) {
      setGeneralError("Please select your Date of Birth.");
      return false;
    }
    if (!gender) {
      setGeneralError("Please select your Gender.");
      return false;
    }
    if (!maritalStatus) {
      setGeneralError("Please select your Marital Status.");
      return false;
    }
    setGeneralError(null);
    return true;
  };

  // Validate Step 2 (Contact Information)
  const validateStep2 = (): boolean => {
    if (!email || !email.includes("@")) {
      setGeneralError("Please enter a valid Email Address.");
      return false;
    }
    if (!mobileNumber.trim()) {
      setGeneralError("Please enter your Mobile Number.");
      return false;
    }
    setGeneralError(null);
    return true;
  };

  // Validate Step 3 (Address Information)
  const validateStep3 = (): boolean => {
    if (!streetAddress.trim()) {
      setGeneralError("Please enter your Street Address.");
      return false;
    }
    if (!city.trim()) {
      setGeneralError("Please enter your City.");
      return false;
    }
    if (!state.trim()) {
      setGeneralError("Please enter your State / Province.");
      return false;
    }
    if (!postalCode.trim()) {
      setGeneralError("Please enter your Postal / ZIP Code.");
      return false;
    }
    if (!country) {
      setGeneralError("Please select your Country.");
      return false;
    }
    setGeneralError(null);
    return true;
  };

  // Validate Step 4 (Security Credentials)
  const validateStep4 = (): boolean => {
    if (password.length < 6) {
      setGeneralError("Password must be at least 6 characters long.");
      return false;
    }
    if (password !== confirmPassword) {
      setGeneralError("Passwords do not match. Please check again.");
      return false;
    }
    setGeneralError(null);
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    } else if (currentStep === 3) {
      if (validateStep3()) setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    setGeneralError(null);
    if (currentStep > 1 && !isSubmitted) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    if (stepId < currentStep && !isSubmitted) {
      setGeneralError(null);
      setCurrentStep(stepId);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateStep1() || !validateStep2() || !validateStep3() || !validateStep4()) {
      return;
    }

    setIsSubmitting(true);
    const fullName = middleName.trim()
      ? `${firstName.trim()} ${middleName.trim()} ${lastName.trim()}`
      : `${firstName.trim()} ${lastName.trim()}`;

    try {
      const formattedPhone = `${dialCode} ${mobileNumber.trim()}`.trim();
      const result = await signup(fullName, email, password, {
        phone: formattedPhone,
        address: streetAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        postalCode: postalCode.trim(),
      });

      if (result.success) {
        setIsSubmitting(false);
        setIsSubmitted(true); // Switch Step 4 view to Verification Confirmation Box
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
    <div className="relative min-h-screen lg:h-screen flex flex-col items-center justify-between p-3 sm:p-5 lg:px-10 lg:py-3 font-sans bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 overflow-x-hidden">

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl my-auto transition-all duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-3">
          <div className="mb-1.5 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-10 sm:h-12 w-auto max-w-[260px] object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            Complete the steps below to join DealFlow360
          </p>
        </div>

        {/* TOP STEPPER BAR WITH CONNECTING LINK LINES */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-md p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="relative flex items-center justify-between max-w-4xl mx-auto">
            {STEPS.map((step, idx) => {
              const isCompleted = currentStep > step.id || (currentStep === 4 && isSubmitted);
              const isActive = currentStep === step.id && !isSubmitted;

              return (
                <React.Fragment key={step.id}>
                  {/* Step Connector Line */}
                  {idx > 0 && (
                    <div className="flex-1 mx-2 sm:mx-4 h-[2px] bg-slate-200 relative overflow-hidden">
                      <div
                        className={`h-full bg-[#007FFF] transition-all duration-500 ease-in-out ${
                          currentStep >= step.id ? "w-full" : "w-0"
                        }`}
                      />
                    </div>
                  )}

                  {/* Step Node */}
                  <div
                    onClick={() => handleStepClick(step.id)}
                    className={`flex flex-col items-center group ${
                      step.id < currentStep && !isSubmitted
                        ? "cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isCompleted
                          ? "bg-[#007FFF] text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-50"
                          : isActive
                          ? "bg-[#007FFF] text-white ring-4 ring-blue-500/20 shadow-md shadow-blue-500/30 scale-105"
                          : "bg-slate-100 text-slate-500 border border-slate-300"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>
                    <span
                      className={`mt-1 text-[11px] font-bold text-center transition-colors max-w-[100px] sm:max-w-none ${
                        isActive || (currentStep === 4 && isSubmitted && step.id === 4)
                          ? "text-[#007FFF]"
                          : isCompleted
                          ? "text-slate-900"
                          : "text-slate-500"
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* STEP FORM BOX */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6 transition-all">
          
          {/* Error Banner */}
          {generalError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-medium">{generalError}</span>
            </div>
          )}

          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-[#007FFF] flex items-center justify-center font-bold text-xs border border-blue-100">
                  1
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Personal Information
                </h2>
              </div>

              {/* Name Row (First, Middle, Last) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Middle Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="Enter middle name"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter last name"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Details Row (DOB, Gender, Marital Status) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Date of Birth <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all cursor-pointer"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Marital Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all cursor-pointer"
                  >
                    <option value="">Select status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all text-white font-semibold py-2.5 px-6 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 text-xs sm:text-sm"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT INFORMATION */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-[#007FFF] flex items-center justify-center font-bold text-xs border border-blue-100">
                  2
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Contact Information
                </h2>
              </div>

              {/* Email, Phone & Secondary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-[90px_1fr] gap-1.5">
                    <select
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      className="w-full bg-slate-100 border border-slate-300 rounded-xl px-2 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#007FFF] cursor-pointer"
                    >
                      {COUNTRY_CODES.map((c, i) => (
                        <option key={i} value={c.code}>
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Secondary Contact (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      value={secondaryPhone}
                      onChange={(e) => setSecondaryPhone(e.target.value)}
                      placeholder="Enter secondary phone"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all text-white font-semibold py-2.5 px-6 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 text-xs sm:text-sm"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ADDRESS INFORMATION */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-50 text-[#007FFF] flex items-center justify-center font-bold text-xs border border-blue-100">
                  3
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Address Information
                </h2>
              </div>

              {/* Street & Country Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Street Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="Enter street address"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all cursor-pointer"
                    >
                      {COUNTRIES.map((c, i) => (
                        <option key={i} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* City, State, Postal Code Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter city"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    State / Province <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Enter state"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Postal / ZIP Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="Enter zip code"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all text-white font-semibold py-2.5 px-6 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 text-xs sm:text-sm"
                >
                  <span>Next: Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SECURITY & EMAIL VERIFICATION */}
          {currentStep === 4 && (
            <div>
              {!isSubmitted ? (
                /* STEP 4 FORM: FIXED EMAIL DISPLAY & PASSWORD INPUTS */
                <form onSubmit={handleFinalSubmit} className="space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-50 text-[#007FFF] flex items-center justify-center font-bold text-xs border border-blue-100">
                      4
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      Security & Account Setup
                    </h2>
                  </div>

                  {/* Fixed Email Display Badge */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-[#007FFF] flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Registered Email Address
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {email || "your-email@company.com"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shrink-0">
                      Target Email
                    </span>
                  </div>

                  {/* Password Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                        Create Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
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
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-300 bg-slate-50/70 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-[#007FFF] transition-all"
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

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#007FFF] hover:bg-[#0066CC] active:scale-[0.99] transition-all text-white font-semibold py-2.5 px-8 rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 text-xs sm:text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Signup & Verify</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* STEP 4 CONFIRMATION: EMAIL VERIFICATION SENT BOX */
                <div className="text-center py-5 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-[#007FFF] border border-blue-100 flex items-center justify-center mx-auto shadow-sm">
                    <Mail className="w-7 h-7" />
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Verify Your Email Address
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Thank you for completing your registration! We have sent a verification link to your email address:
                  </p>

                  <div className="bg-slate-50 border border-slate-200 text-slate-800 font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm inline-block my-1 shadow-sm">
                    {email || "your-email@company.com"}
                  </div>

                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Please check your inbox and click the verification link to activate your DealFlow360 account.
                  </p>

                  <div className="pt-4 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="bg-[#007FFF] hover:bg-[#0066CC] text-white font-semibold py-2.5 px-8 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
                    >
                      <span>Go to Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
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
    </div>
  );
}


