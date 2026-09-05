import React from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  CircleDollarSign,
  Sliders,
  ShieldCheck,
  Warehouse,
  Repeat,
  Sparkles,
  FileText,
  Settings,
  FileSpreadsheet,
  GitPullRequest,
  PlusCircle,
  CheckSquare,
  Truck,
  CreditCard,
  HeartPulse,
  Clock,
  PackageX,
  Receipt,
  UserCheck,
  FolderKanban,
  MessageSquare,
} from "lucide-react";
import { UserRole } from "@/context/auth-context";

export interface NavItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  badge?: string;
  children?: { title: string; href: string }[];
}

export function getMenuItemsForRole(role: UserRole | null): NavItem[] {
  if (!role) return [];

  switch (role) {
    case "ADMIN":
      return [
        {
          title: "Dashboard",
          href: "/admin/dashboard",
          icon: React.createElement(LayoutDashboard, { size: 18 }),
        },
        {
          title: "Team & Roles",
          href: "/admin/users",
          icon: React.createElement(Users, { size: 18 }),
        },
        {
          title: "Customers",
          href: "/admin/customers",
          icon: React.createElement(Building2, { size: 18 }),
        },
        {
          title: "Products",
          href: "/admin/products",
          icon: React.createElement(Package, { size: 18 }),
        },
        {
          title: "Price Lists",
          href: "/admin/price-lists",
          icon: React.createElement(CircleDollarSign, { size: 18 }),
        },
        {
          title: "Discount & Approval",
          icon: React.createElement(Sliders, { size: 18 }),
          children: [
            { title: "Discount Tiers", href: "/admin/discount-rules" },
            { title: "Approval Chains", href: "/admin/approval-chains" },
          ],
        },
        {
          title: "Warehouses",
          href: "/admin/warehouses",
          icon: React.createElement(Warehouse, { size: 18 }),
        },
        {
          title: "Subscription Plans",
          href: "/admin/subscription-plans",
          icon: React.createElement(Repeat, { size: 18 }),
        },
        {
          title: "Upsell / Cross-sell Rules",
          href: "/admin/upsell-rules",
          icon: React.createElement(Sparkles, { size: 18 }),
        },
        {
          title: "Reports",
          href: "/admin/reports",
          icon: React.createElement(FileText, { size: 18 }),
        },
      ];

    case "SALES_REP":
      return [
        {
          title: "Dashboard",
          href: "/sales/dashboard",
          icon: React.createElement(LayoutDashboard, { size: 18 }),
        },
        {
          title: "Customers",
          href: "/sales/customers",
          icon: React.createElement(Building2, { size: 18 }),
        },
        {
          title: "Quotations",
          icon: React.createElement(FileSpreadsheet, { size: 18 }),
          children: [
            { title: "All Quotations", href: "/sales/quotations" },
            { title: "New Quotation", href: "/sales/quotations/new" },
          ],
        },
        {
          title: "Pipeline",
          href: "/sales/pipeline",
          icon: React.createElement(GitPullRequest, { size: 18 }),
        },
        {
          title: "Approvals",
          href: "/sales/approvals",
          icon: React.createElement(CheckSquare, { size: 18 }),
        },
        {
          title: "Fulfillment",
          href: "/sales/fulfillment",
          icon: React.createElement(Truck, { size: 18 }),
        },
        {
          title: "Billing",
          href: "/sales/billing",
          icon: React.createElement(CreditCard, { size: 18 }),
        },
        {
          title: "Deal Health",
          href: "/sales/deal-health",
          icon: React.createElement(HeartPulse, { size: 18 }),
        },
      ];

    case "SALES_MANAGER":
      return [
        {
          title: "Dashboard",
          href: "/manager/dashboard",
          icon: React.createElement(LayoutDashboard, { size: 18 }),
        },
        {
          title: "Customers",
          href: "/sales/customers",
          icon: React.createElement(Building2, { size: 18 }),
        },
        {
          title: "Quotations",
          icon: React.createElement(FileSpreadsheet, { size: 18 }),
          children: [
            { title: "All Quotations", href: "/manager/quotations" },
            { title: "New Quotation", href: "/sales/quotations/new" },
          ],
        },
        {
          title: "Approval Queue",
          href: "/manager/approval-queue",
          icon: React.createElement(CheckSquare, { size: 18 }),
          badge: "Pending",
        },
        {
          title: "Deal Health",
          href: "/manager/deal-health",
          icon: React.createElement(HeartPulse, { size: 18 }),
        },
        {
          title: "Discount Tiers",
          href: "/manager/discount-rules",
          icon: React.createElement(Sliders, { size: 18 }),
        },
        {
          title: "Approval Chains",
          href: "/manager/approval-chains",
          icon: React.createElement(ShieldCheck, { size: 18 }),
        },
        {
          title: "Reports",
          href: "/manager/reports",
          icon: React.createElement(FileText, { size: 18 }),
        },
      ];

    case "FINANCE":
      return [
        {
          title: "Dashboard",
          href: "/finance/dashboard",
          icon: React.createElement(LayoutDashboard, { size: 18 }),
        },
        {
          title: "Approval Queue",
          href: "/finance/approval-queue",
          icon: React.createElement(CheckSquare, { size: 18 }),
          badge: "Review",
        },
        {
          title: "Fulfillment",
          href: "/finance/fulfillment",
          icon: React.createElement(Truck, { size: 18 }),
        },
        {
          title: "Backorders",
          href: "/finance/backorders",
          icon: React.createElement(PackageX, { size: 18 }),
        },
        {
          title: "Billing",
          href: "/finance/billing",
          icon: React.createElement(CreditCard, { size: 18 }),
        },
        {
          title: "Subscriptions",
          href: "/finance/subscriptions",
          icon: React.createElement(Repeat, { size: 18 }),
        },
        {
          title: "Credit Notes",
          href: "/finance/credit-notes",
          icon: React.createElement(Receipt, { size: 18 }),
        },
        {
          title: "Reports",
          href: "/finance/reports",
          icon: React.createElement(FileText, { size: 18 }),
        },
      ];

    case "CUSTOMER":
      return [
        {
          title: "Dashboard",
          href: "/portal",
          icon: React.createElement(LayoutDashboard, { size: 18 }),
        },
        {
          title: "My Quotations",
          href: "/portal/quotations",
          icon: React.createElement(FileSpreadsheet, { size: 18 }),
        },
        {
          title: "Under Negotiation",
          href: "/portal/negotiation",
          icon: React.createElement(MessageSquare, { size: 18 }),
        },
        {
          title: "Confirmed",
          href: "/portal/confirmed",
          icon: React.createElement(CheckSquare, { size: 18 }),
        },
        {
          title: "Profile",
          href: "/portal/profile",
          icon: React.createElement(UserCheck, { size: 18 }),
        },
      ];

    default:
      return [];
  }
}
