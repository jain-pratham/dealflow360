"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./auth-context";

export interface AppNotification {
  id: string;
  type: "HIGH" | "ENQUIRY" | "QUOTATION" | "APPROVAL" | "BILLING" | "SYSTEM" | "GOVERNANCE";
  tag: string;
  tagStyle: "high" | "enquiry" | "info" | "success" | "warning";
  iconType: "help" | "shield" | "check" | "alert" | "file" | "sparkles" | "user";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    type: "HIGH",
    tag: "High",
    tagStyle: "high",
    iconType: "help",
    title: "Enquiry Converted to Lead",
    message: "Enquiry from jain jeetendra converted to Lead.",
    timestamp: "10 days ago",
    isRead: false,
  },
  {
    id: "notif-2",
    type: "ENQUIRY",
    tag: "Enquiry",
    tagStyle: "enquiry",
    iconType: "help",
    title: "Enquiry Updated",
    message: "Enquiry details updated for jain jeetendra.",
    timestamp: "10 days ago",
    isRead: false,
  },
  {
    id: "notif-3",
    type: "ENQUIRY",
    tag: "Enquiry",
    tagStyle: "enquiry",
    iconType: "help",
    title: "New Enquiry Received",
    message: "New enquiry received from jain jeetendra.",
    timestamp: "10 days ago",
    isRead: false,
  },
  {
    id: "notif-4",
    type: "HIGH",
    tag: "High",
    tagStyle: "high",
    iconType: "shield",
    title: "Password Reset Completed",
    message: "Your account password was successfully reset.",
    timestamp: "10 days ago",
    isRead: false,
  },
  {
    id: "notif-5",
    type: "QUOTATION",
    tag: "Quotation",
    tagStyle: "info",
    iconType: "file",
    title: "Quotation QT-2026-0001 Updated",
    message: "Quotation QT-2026-0001 status changed to CONFIRMED.",
    timestamp: "2 hours ago",
    isRead: true,
  },
  {
    id: "notif-6",
    type: "APPROVAL",
    tag: "Approval",
    tagStyle: "warning",
    iconType: "alert",
    title: "Discount Approval Pending",
    message: "Quote QT-2026-0003 requires 20% discount approval.",
    timestamp: "5 hours ago",
    isRead: false,
  },
  {
    id: "notif-7",
    type: "BILLING",
    tag: "Payment",
    tagStyle: "success",
    iconType: "check",
    title: "Invoice Payment Received",
    message: "Payment of ₹45,000 received for Invoice INV-2026-0001.",
    timestamp: "1 day ago",
    isRead: true,
  },
];

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  addNotification: (notif: Omit<AppNotification, "id" | "isRead">) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(DEFAULT_NOTIFICATIONS);

  // Load / Save to LocalStorage for user persistence
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storageKey = `df360_notifications_${user?.id || "guest"}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch {
          setNotifications(DEFAULT_NOTIFICATIONS);
        }
      }
    }
  }, [user?.id]);

  const saveNotifications = (items: AppNotification[]) => {
    setNotifications(items);
    if (typeof window !== "undefined") {
      const storageKey = `df360_notifications_${user?.id || "guest"}`;
      localStorage.setItem(storageKey, JSON.stringify(items));
    }
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    saveNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const addNotification = (notif: Omit<AppNotification, "id" | "isRead">) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      isRead: false,
    };
    saveNotifications([newNotif, ...notifications]);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
