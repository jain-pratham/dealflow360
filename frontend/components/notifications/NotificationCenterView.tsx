"use client";

import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import {
  Bell,
  Check,
  Trash2,
  Search,
  Filter,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Inbox,
  Clock,
} from "lucide-react";
import { useNotifications, AppNotification } from "@/context/notification-context";

export function NotificationCenterView() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } =
    useNotifications();
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "HIGH" | "ENQUIRY" | "SYSTEM">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotifications = notifications.filter((n) => {
    // Tab filter
    if (activeTab === "UNREAD" && n.isRead) return false;
    if (activeTab === "HIGH" && n.tagStyle !== "high") return false;
    if (activeTab === "ENQUIRY" && n.tagStyle !== "enquiry") return false;
    if (activeTab === "SYSTEM" && n.type !== "SYSTEM" && n.type !== "GOVERNANCE") return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.tag.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderIcon = (iconType: string) => {
    switch (iconType) {
      case "help":
        return <HelpCircle size={22} className="text-amber-600 dark:text-amber-400" />;
      case "shield":
        return <ShieldCheck size={22} className="text-purple-600 dark:text-purple-400" />;
      case "check":
        return <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400" />;
      case "alert":
        return <AlertTriangle size={22} className="text-red-600 dark:text-red-400" />;
      case "file":
        return <FileText size={22} className="text-blue-600 dark:text-blue-400" />;
      case "sparkles":
        return <Sparkles size={22} className="text-indigo-600 dark:text-indigo-400" />;
      default:
        return <HelpCircle size={22} className="text-amber-600 dark:text-amber-400" />;
    }
  };

  const renderIconBg = (iconType: string) => {
    switch (iconType) {
      case "help":
        return "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60";
      case "shield":
        return "bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:border-purple-900/60";
      case "check":
        return "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60";
      case "alert":
        return "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900/60";
      case "file":
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60";
      default:
        return "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60";
    }
  };

  const renderTagStyle = (tagStyle: string) => {
    switch (tagStyle) {
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-900/60 font-bold";
      case "enquiry":
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold";
      case "success":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-900/60 font-bold";
      case "warning":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-900/60 font-bold";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-900/60 font-bold";
    }
  };

  return (
    <AppLayout>
      <PageHeader
        badgeText="Real-Time Alerts"
        title="Notification Center"
        description="View, manage, and track system alerts, customer enquiries, approval requests, and security updates."
      />

      <div className="space-y-6">
        {/* Action Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter notifications by keyword..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 outline-none focus:border-[#0D69B2] focus:ring-2 focus:ring-[#0D69B2]/15 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-slate-800 text-[#0D69B2] dark:text-blue-400 text-xs font-bold hover:bg-blue-100/70 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              <Check size={16} className="stroke-[2.5]" />
              <span>Mark all read</span>
            </button>

            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100/70 dark:hover:bg-red-900/40 transition-all cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Clear all</span>
            </button>
          </div>
        </div>

        {/* Tab Category Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { id: "ALL", label: "All Notifications", count: notifications.length },
            { id: "UNREAD", label: "Unread", count: unreadCount },
            { id: "HIGH", label: "High Priority", count: notifications.filter((n) => n.tagStyle === "high").length },
            { id: "ENQUIRY", label: "Enquiries", count: notifications.filter((n) => n.tagStyle === "enquiry").length },
            { id: "SYSTEM", label: "System & Governance", count: notifications.filter((n) => n.type === "SYSTEM" || n.type === "GOVERNANCE").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#0D69B2] text-white shadow-md shadow-blue-500/20"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Notification Cards List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500">
              <Inbox size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
              <h4 className="font-extrabold text-base text-slate-700 dark:text-slate-300">
                No notifications found
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                You're all caught up! No notifications matching current filter.
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`relative flex items-start justify-between gap-4 p-5 transition-colors ${
                  !n.isRead
                    ? "bg-blue-50/20 dark:bg-slate-800/40 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#0D69B2]"
                    : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                }`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  {/* Left Circle Icon */}
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border shadow-2xs ${renderIconBg(
                      n.iconType
                    )}`}
                  >
                    {renderIcon(n.iconType)}
                  </div>

                  {/* Body Content */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded border text-[11px] ${renderTagStyle(n.tagStyle)}`}>
                        {n.tag}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                        <Clock size={13} />
                        {n.timestamp}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                      {n.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                      {n.message}
                    </p>
                  </div>
                </div>

                {/* Right Item Action Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0D69B2] dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-blue-400 text-xs font-extrabold transition-all cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
