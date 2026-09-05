"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  ChevronRight,
  ChevronDown,
  User,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/context/theme-context";
import { useAuth } from "@/context/auth-context";
import { getRoleDisplayName } from "@/lib/role-utils";

interface HeaderProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
}

export default function Header({
  sidebarCollapsed,
  onMobileMenuToggle,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    router.push("/login");
  };

  // Generate breadcrumb text from current pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbText =
    pathSegments.length > 0
      ? pathSegments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" / ")
      : "Dashboard";

  // Helpers for user profile display
  const userName = user?.name || user?.email?.split("@")[0] || "User";
  const userRoleText = getRoleDisplayName(user?.role);

  const profileHref =
    user?.role === "ADMIN"
      ? "/admin/profile"
      : user?.role === "SALES_MANAGER"
      ? "/manager/profile"
      : user?.role === "SALES_REP"
      ? "/sales/profile"
      : user?.role === "FINANCE"
      ? "/finance/profile"
      : "/portal/profile";

  const initials = user?.name
    ? user.name
        .trim()
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "PJ";

  return (
    <header
      className={`fixed top-3.5 right-3.5 z-30 transition-all duration-300 ${
        sidebarCollapsed ? "left-[84px]" : "left-[284px]"
      } max-lg:left-3.5 h-14 md:h-16 flex items-center justify-between px-4 md:px-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs`}
    >
      {/* Left side: Mobile menu toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400">
          <span className="text-[#0D69B2] font-bold">DealFlow360</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-900 dark:text-slate-100 font-extrabold">
            {breadcrumbText}
          </span>
        </div>
      </div>

      {/* Right side: Search, Theme Toggle, Notification Bell, User Avatar Dropdown */}
      <div className="flex items-center gap-2.5 md:gap-3">
        {/* Quick Search Input */}
        <div className="relative hidden md:block w-44 lg:w-60">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search deals, quotes..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 outline-none focus:border-[#0D69B2] focus:ring-2 focus:ring-[#0D69B2]/15 transition-all"
          />
        </div>

        {/* Theme Toggle Pill Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/70 shadow-2xs transition-all cursor-pointer text-xs font-semibold"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? (
            <>
              <Moon size={15} className="text-blue-400" />
              <span>Dark</span>
            </>
          ) : (
            <>
              <Sun size={15} className="text-amber-500" />
              <span>Light</span>
            </>
          )}
        </button>

        {/* Notification Bell Circle Button */}
        <div className="relative">
          <button
            className="w-9 h-9 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-all cursor-pointer shadow-2xs relative"
            title="Notifications"
          >
            <Bell size={17} />
            <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white font-extrabold text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-2xs">
              57
            </span>
          </button>
        </div>

        {/* User Profile Dropdown Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/50 dark:bg-slate-800/80 hover:bg-blue-100/50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-[#0D69B2] text-white flex items-center justify-center font-extrabold text-xs shadow-2xs shrink-0">
              {initials}
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
              {userRoleText}
            </span>
            <ChevronDown
              size={14}
              className={`text-slate-600 dark:text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* User Profile Popup Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Profile Card Header */}
              <div className="bg-slate-100/70 dark:bg-slate-800/70 rounded-lg px-2.5 py-2 flex items-center gap-2.5 mb-1">
                <div className="w-7 h-7 rounded-full bg-[#0D69B2] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs">
                  {initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {userRoleText}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate leading-tight">
                    {user?.email || "admin@dealflow360.com"}
                  </span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="pt-0.5">
                <Link
                  href={profileHref}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <User size={16} className="text-[#0D69B2]" />
                  <span>Profile</span>
                </Link>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 text-xs font-bold text-[#F4882E] hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut size={16} className="text-[#F4882E]" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
