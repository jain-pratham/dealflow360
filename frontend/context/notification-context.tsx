"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./auth-context";
import { apiClient } from "@/lib/api-client";
import { io, Socket } from "socket.io-client";

export interface AppNotification {
  id: string;
  type: string;
  tag: string;
  tagStyle: "high" | "enquiry" | "info" | "success" | "warning";
  iconType: "help" | "shield" | "check" | "alert" | "file" | "sparkles" | "user";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  pushStatus: "default" | "granted" | "denied" | "unsupported";
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  enableWebPush: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function mapTypeToTag(type: string): { tag: string; tagStyle: AppNotification["tagStyle"]; iconType: AppNotification["iconType"] } {
  switch (type) {
    case "APPROVAL_REQUESTED":
      return { tag: "Approval Required", tagStyle: "high", iconType: "alert" };
    case "APPROVAL_APPROVED":
      return { tag: "Approved", tagStyle: "success", iconType: "check" };
    case "APPROVAL_REJECTED":
      return { tag: "Rejected", tagStyle: "warning", iconType: "alert" };
    case "CUSTOMER_NEGOTIATION_SUBMITTED":
      return { tag: "Negotiation", tagStyle: "high", iconType: "help" };
    case "QUOTATION_CONFIRMED":
      return { tag: "Order Confirmed", tagStyle: "success", iconType: "check" };
    case "QUOTATION_SENT":
      return { tag: "Quotation", tagStyle: "info", iconType: "file" };
    case "FULFILLMENT_STARTED":
      return { tag: "Fulfillment", tagStyle: "info", iconType: "file" };
    case "BACKORDER_CREATED":
      return { tag: "Backorder", tagStyle: "warning", iconType: "alert" };
    case "SHIPMENT_DISPATCHED":
      return { tag: "Dispatched", tagStyle: "info", iconType: "file" };
    case "DELIVERY_COMPLETED":
      return { tag: "Delivered", tagStyle: "success", iconType: "check" };
    case "INVOICE_GENERATED":
    case "RECURRING_INVOICE_GENERATED":
      return { tag: "Invoice Generated", tagStyle: "info", iconType: "file" };
    case "INVOICE_OVERDUE":
      return { tag: "Invoice Overdue", tagStyle: "warning", iconType: "alert" };
    case "PAYMENT_SUCCESS":
    case "RECURRING_PAYMENT_SUCCESS":
      return { tag: "Payment Successful", tagStyle: "success", iconType: "check" };
    case "PAYMENT_FAILED":
    case "RECURRING_PAYMENT_FAILED":
      return { tag: "Payment Failed", tagStyle: "warning", iconType: "alert" };
    case "SUBSCRIPTION_CREATED":
      return { tag: "Subscription Active", tagStyle: "info", iconType: "sparkles" };
    case "SUBSCRIPTION_CANCELLED":
      return { tag: "Subscription Cancelled", tagStyle: "warning", iconType: "alert" };
    case "DEAL_HEALTH_CRITICAL":
      return { tag: "Critical Risk", tagStyle: "high", iconType: "shield" };
    case "ROLE_UPDATED":
    case "SYSTEM_ALERT":
      return { tag: "System Alert", tagStyle: "high", iconType: "shield" };
    default:
      return { tag: "Notification", tagStyle: "info", iconType: "help" };
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  return `${Math.floor(diffSec / 86400)} days ago`;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [pushStatus, setPushStatus] = useState<"default" | "granted" | "denied" | "unsupported">("default");

  // Check browser notification permission status
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushStatus(Notification.permission as any);
    } else {
      setPushStatus("unsupported");
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [listRes, countRes] = await Promise.all([
        apiClient.get<{ items: any[]; total: number }>("/notifications?limit=50"),
        apiClient.get<{ unreadCount: number }>("/notifications/unread-count"),
      ]);

      if (listRes.data?.items) {
        const mapped: AppNotification[] = listRes.data.items.map((item: any) => {
          const { tag, tagStyle, iconType } = mapTypeToTag(item.type);
          return {
            id: item.id,
            type: item.type,
            tag,
            tagStyle,
            iconType,
            title: item.title,
            message: item.message,
            timestamp: formatRelativeTime(item.createdAt),
            isRead: item.isRead,
            metadata: item.metadata,
            createdAt: item.createdAt,
          };
        });
        setNotifications(mapped);
      }

      if (typeof countRes.data?.unreadCount === "number") {
        setUnreadCount(countRes.data.unreadCount);
      }
    } catch {
      // Fallback silently if unauthenticated
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time Socket.IO Connection for targeted user notifications
  useEffect(() => {
    if (!user?.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const socket: Socket = io(`${socketUrl}/notifications`, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("joinUserRoom", { userId: user.id });
    });

    socket.on("notification.created", (newNotif: any) => {
      const { tag, tagStyle, iconType } = mapTypeToTag(newNotif.type);
      const mappedNotif: AppNotification = {
        id: newNotif.id,
        type: newNotif.type,
        tag,
        tagStyle,
        iconType,
        title: newNotif.title,
        message: newNotif.message,
        timestamp: "Just now",
        isRead: false,
        metadata: newNotif.metadata,
        createdAt: newNotif.createdAt,
      };

      setNotifications((prev) => [mappedNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      // Rollback on failure
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await apiClient.patch("/notifications/read-all");
    } catch {
      fetchNotifications();
    }
  };

  const deleteNotification = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await apiClient.delete(`/notifications/${id}`);
    } catch {
      fetchNotifications();
    }
  };

  const clearAll = async () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Web Push Subscription Logic
  const enableWebPush = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushStatus("unsupported");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission as any);

      if (permission !== "granted") {
        return false;
      }

      // Register Service Worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID public key from backend
      const keyRes = await apiClient.get<{ vapidPublicKey: string }>("/notifications/vapid-public-key");
      const vapidPublicKey = keyRes.data?.vapidPublicKey;

      if (!vapidPublicKey) {
        return false;
      }

      // Convert VAPID key to Uint8Array
      const padding = "=".repeat((4 - (vapidPublicKey.length % 4)) % 4);
      const base64 = (vapidPublicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      // Subscribe via PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray,
      });

      const p256dh = subscription.getKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey("p256dh")!)))) : "";
      const auth = subscription.getKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey("auth")!)))) : "";

      // Send subscription to backend API
      await apiClient.post("/notifications/push-subscriptions", {
        endpoint: subscription.endpoint,
        keys: { p256dh, auth },
      });

      return true;
    } catch (err) {
      console.error("Failed to enable Web Push:", err);
      return false;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        pushStatus,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        enableWebPush,
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
