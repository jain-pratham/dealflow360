"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, Sun, Moon, Menu, ChevronRight } from "lucide-react";
import { useTheme } from "@/context/theme-context";
import { useAuth } from "@/context/auth-context";

interface HeaderProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
}

export default function Header({
  sidebarCollapsed,
  onMobileMenuToggle,
}: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  // Generate breadcrumb text from current pathname
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbText =
    pathSegments.length > 0
      ? pathSegments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" / ")
      : "Dashboard";

  return (
    <header
      className={`fixed top-3.5 right-3.5 z-30 transition-all duration-300 ${
        sidebarCollapsed ? "left-[84px]" : "left-[284px]"
      } max-lg:left-3.5 h-14 md:h-16 flex items-center justify-between px-4 md:px-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm`}
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

      {/* Right side: Search, Theme Toggle, Notification Bell, User Avatar */}
      <div className="flex items-center gap-2.5 md:gap-4">
        {/* Quick Search Input */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search deals, leads, quotes..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 outline-none focus:border-[#0D69B2] focus:ring-2 focus:ring-[#0D69B2]/15 transition-all"
          />
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        >
          {theme === "dark" ? (
            <Sun size={18} className="text-amber-400" />
          ) : (
            <Moon size={18} className="text-slate-700" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EC2091] ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* User Profile Avatar Pill */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-xl bg-[#0D69B2] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white/20">
            {user?.email?.substring(0, 2).toUpperCase() || "DF"}
          </div>
          <div className="hidden xl:flex flex-col">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.email?.split("@")[0]}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {user?.role || "Manager"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
