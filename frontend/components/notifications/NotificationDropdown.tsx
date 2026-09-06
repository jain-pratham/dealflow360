"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  User,
  Bell,
} from "lucide-react";
import { useNotifications, AppNotification } from "@/context/notification-context";
import { useAuth } from "@/context/auth-context";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { role } = useAuth();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const notificationsPageHref =
    role === "ADMIN"
      ? "/admin/notifications"
      : role === "SALES_MANAGER"
      ? "/manager/notifications"
      : role === "SALES_REP"
      ? "/sales/notifications"
      : role === "FINANCE"
      ? "/finance/notifications"
      : "/portal/notifications";

  const renderIcon = (iconType: string) => {
    switch (iconType) {
      case "help":
        return <HelpCircle size={20} className="text-amber-600 dark:text-amber-400" />;
      case "shield":
        return <ShieldCheck size={20} className="text-purple-600 dark:text-purple-400" />;
      case "check":
        return <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />;
      case "alert":
        return <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />;
      case "file":
        return <FileText size={20} className="text-blue-600 dark:text-blue-400" />;
      case "sparkles":
        return <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400" />;
      default:
        return <HelpCircle size={20} className="text-amber-600 dark:text-amber-400" />;
    }
  };

  const renderIconBg = (iconType: string) => {
    switch (iconType) {
      case "help":
        return "bg-amber-50/80 border-amber-200/70 dark:bg-amber-950/30 dark:border-amber-900/50";
      case "shield":
        return "bg-purple-50/80 border-purple-200/70 dark:bg-purple-950/30 dark:border-purple-900/50";
      case "check":
        return "bg-emerald-50/80 border-emerald-200/70 dark:bg-emerald-950/30 dark:border-emerald-900/50";
      case "alert":
        return "bg-red-50/80 border-red-200/70 dark:bg-red-950/30 dark:border-red-900/50";
      case "file":
        return "bg-blue-50/80 border-blue-200/70 dark:bg-blue-950/30 dark:border-blue-900/50";
      default:
        return "bg-amber-50/80 border-amber-200/70 dark:bg-amber-950/30 dark:border-amber-900/50";
    }
  };

  const renderTagStyle = (tagStyle: string) => {
    switch (tagStyle) {
      case "high":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-bold";
      case "enquiry":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold";
      case "success":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold";
      case "warning":
        return "bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 font-bold";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 font-bold";
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2.5 w-[360px] sm:w-[410px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-500 text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={markAllAsRead}
          className="flex items-center gap-1.5 text-xs font-bold text-[#0D69B2] hover:text-[#0a528c] dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
        >
          <Check size={15} className="stroke-[2.5]" />
          <span>Mark all read</span>
        </button>
      </div>

      {/* List Container */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">
            <Bell size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No notifications right now</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => markAsRead(item.id)}
              className={`relative flex items-start gap-3.5 p-4 transition-colors cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                !item.isRead
                  ? "bg-blue-50/20 dark:bg-slate-800/30 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3.5px] before:bg-[#0D69B2]"
                  : ""
              }`}
            >
              {/* Left Round Icon */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${renderIconBg(
                  item.iconType
                )}`}
              >
                {renderIcon(item.iconType)}
              </div>

              {/* Item Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] ${renderTagStyle(item.tagStyle)}`}>
                    {item.tag}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {item.timestamp}
                  </span>
                </div>

                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1 leading-snug">
                  {item.title}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed truncate">
                  {item.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Bar */}
      <div className="p-3 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-b-2xl">
        <Link
          href={notificationsPageHref}
          onClick={onClose}
          className="inline-block text-xs md:text-sm font-extrabold text-[#0D69B2] hover:text-[#0a528c] dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}
