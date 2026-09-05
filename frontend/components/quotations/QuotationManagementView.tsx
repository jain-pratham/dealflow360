"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/DataTable";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  RotateCcw,
  X,
  ArrowLeft,
  Loader2,
  Edit2,
  Send,
  Building2,
  User,
  ShieldCheck,
  Ban,
  Clock,
  Package,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  Download,
  ExternalLink,
  Eye,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  CheckSquare,
  Square,
  ChevronRight,
  Sparkles,
  FileText,
  Copy,
  Tag,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

export type QuotationStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SENT_TO_CUSTOMER"
  | "SENT"
  | "UNDER_NEGOTIATION"
  | "REJECTED"
  | "CONFIRMED"
  | "FULFILLED"
  | "CANCELLED";

export interface Customer {
  id: string;
  name?: string;
  contactName?: string;
  companyName?: string;
  email?: string;
  contactEmail?: string;
  tier?: "BRONZE" | "SILVER" | "GOLD";
  customerTier?: "BRONZE" | "SILVER" | "GOLD";
  currency?: string;
  isActive: boolean;
}

export function formatCustomerOptionLabel(c: Customer): string {
  const company = c.companyName?.trim();
  const person = (c.contactName || c.name)?.trim();
  const email = (c.email || c.contactEmail)?.trim();
  const tier = (c.tier || c.customerTier || "BRONZE").toUpperCase();

  let namePart = company || person || "Customer Account";
  if (company && person && company.toLowerCase() !== person.toLowerCase()) {
    namePart = `${company} (${person})`;
  }

  const details = [email, `${tier} Tier`].filter(Boolean).join(" • ");
  return details ? `${namePart} — ${details}` : namePart;
}

export function getCustomerNameLabel(c: Customer): string {
  const company = c.companyName?.trim();
  const person = (c.contactName || c.name)?.trim();
  if (company && person && company.toLowerCase() !== person.toLowerCase()) {
    return `${company} (${person})`;
  }
  return company || person || "Customer Account";
}

export function getCustomerEmailLabel(c: Customer): string {
  return (c.email || c.contactEmail || "").trim();
}

export function getCustomerTierLabel(c: Customer): string {
  return (c.tier || c.customerTier || "BRONZE").toUpperCase();
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: "HARDWARE" | "SERVICES" | "SUBSCRIPTIONS";
  basePrice: number;
  taxRate: number;
  currency: string;
  isActive: boolean;
}

export interface QuotationLine {
  id?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  finalUnitPrice: number;
  product?: Product;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  customerId: string;
  salesRepId: string;
  status: QuotationStatus;
  currency: string;
  subtotalAmount: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  notes?: string;
  portalToken: string;
  createdAt: string;
  updatedAt?: string;
  customer?: Customer;
  salesRep?: { id: string; name: string; email: string };
  lines?: QuotationLine[];
  approvalRequests?: any[];
  auditLogs?: any[];
}

export default function QuotationManagementView({ initialCreateMode = false }: { initialCreateMode?: boolean }) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // View Modes: "table" | "kanban" | "create"
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "create">(initialCreateMode ? "create" : "table");
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  
  // Sorting State
  const [sortField, setSortField] = useState<"quoteNumber" | "createdAt" | "totalAmount" | "customer">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Slide-over Detail Drawer
  const [drawerQuotation, setDrawerQuotation] = useState<Quotation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<"items" | "customer" | "approvals">("items");
  const [drawerRecommendations, setDrawerRecommendations] = useState<{ upsell: any[]; crossSell: any[] } | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState<boolean>(false);

  // Form State (New Quotation)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currency, setCurrency] = useState<string>("INR");
  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<QuotationLine[]>([]);

  // Add Line State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [resolvedUnitPrice, setResolvedUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Live Discount Governance Feedback State
  const [discountFeedback, setDiscountFeedback] = useState<{
    allowed: boolean;
    requiresApproval: boolean;
    approvalRole?: string | null;
    reason?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchQuotations = async () => {
    setLoading(true);
    const params: any = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (statusFilter !== "ALL") params.status = statusFilter;

    const res = await apiClient.get<{ data: Quotation[] }>("/quotations", params);
    if (res.data && Array.isArray((res.data as any).data)) {
      setQuotations((res.data as any).data);
    } else if (Array.isArray(res.data)) {
      setQuotations(res.data as any);
    } else {
      setQuotations([]);
    }
    setLoading(false);
  };

  const fetchCustomersAndProducts = async () => {
    const [cRes, pRes] = await Promise.all([
      apiClient.get<Customer[]>("/customers"),
      apiClient.get<{ data: Product[] }>("/products", { isActive: true, limit: 100 }),
    ]);

    if (cRes.data && Array.isArray(cRes.data)) {
      setCustomers(cRes.data.filter((c) => c.isActive));
    }
    if (pRes.data && Array.isArray((pRes.data as any).data)) {
      setProducts((pRes.data as any).data);
    } else if (Array.isArray(pRes.data)) {
      setProducts(pRes.data as any);
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchCustomersAndProducts();
  }, [searchQuery, statusFilter]);

  // Customer selection side effect
  useEffect(() => {
    if (selectedCustomerId) {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      if (cust) {
        setSelectedCustomer(cust);
        setCurrency(cust.currency || "INR");
      }
    } else {
      setSelectedCustomer(null);
    }
  }, [selectedCustomerId, customers]);

  // Product price resolution side effect
  useEffect(() => {
    const resolvePrice = async () => {
      if (selectedProductId && selectedCustomer) {
        const prod = products.find((p) => p.id === selectedProductId);
        if (prod) {
          setSelectedProduct(prod);
          const tier = getCustomerTierLabel(selectedCustomer);
          const res = await apiClient.get<{ price: number }>(
            `/price-lists/resolve-price?productId=${prod.id}&customerTier=${tier}&currency=${currency}`
          );
          if (res.data && typeof res.data.price === "number") {
            setResolvedUnitPrice(res.data.price);
          } else {
            setResolvedUnitPrice(prod.basePrice);
          }
        }
      } else {
        setSelectedProduct(null);
        setResolvedUnitPrice(0);
      }
    };
    resolvePrice();
  }, [selectedProductId, selectedCustomer, currency, products]);

  // Evaluate discount in real-time
  useEffect(() => {
    const evalDiscount = async () => {
      if (selectedProduct && selectedCustomer && discountPercent >= 0) {
        const tier = getCustomerTierLabel(selectedCustomer);
        const res = await apiClient.post<{
          allowed: boolean;
          requiresApproval: boolean;
          approvalRole: string | null;
          reason: string;
        }>("/discount-rules/evaluate", {
          customerTier: tier,
          productCategory: selectedProduct.category,
          discountPercent,
        });

        if (res.data) {
          setDiscountFeedback({
            allowed: res.data.allowed,
            requiresApproval: res.data.requiresApproval,
            approvalRole: res.data.approvalRole,
            reason: res.data.reason,
          });
        }
      } else {
        setDiscountFeedback(null);
      }
    };
    evalDiscount();
  }, [discountPercent, selectedProduct, selectedCustomer]);

  // Formatting helper
  const formatPrice = (val: number, cur: string = "INR") => {
    const symbolMap: Record<string, string> = { INR: "₹", USD: "$", EUR: "€" };
    const sym = symbolMap[cur] || cur;
    return `${sym}${Number(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter & Sort Calculations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // Search
      const search = searchQuery.toLowerCase().trim();
      if (search) {
        const matchNumber = q.quoteNumber?.toLowerCase().includes(search);
        const matchCustomer = q.customer?.companyName?.toLowerCase().includes(search) || q.customer?.name?.toLowerCase().includes(search);
        const matchEmail = q.customer?.email?.toLowerCase().includes(search);
        if (!matchNumber && !matchCustomer && !matchEmail) return false;
      }
      // Status Filter
      if (statusFilter !== "ALL" && q.status !== statusFilter) return false;

      // Tier Filter
      if (tierFilter !== "ALL" && q.customer?.tier !== tierFilter) return false;

      // Amount Range
      if (minAmount && Number(q.totalAmount) < Number(minAmount)) return false;
      if (maxAmount && Number(q.totalAmount) > Number(maxAmount)) return false;

      return true;
    }).sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (sortField === "customer") {
        valA = a.customer?.companyName || "";
        valB = b.customer?.companyName || "";
      }
      if (sortField === "createdAt") {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [quotations, searchQuery, statusFilter, tierFilter, minAmount, maxAmount, sortField, sortOrder]);

  // Dashboard Summary Metrics
  const stats = useMemo(() => {
    const totalCount = quotations.length;
    const totalGross = quotations.reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);

    const pendingList = quotations.filter((q) => ["DRAFT", "PENDING_APPROVAL", "UNDER_NEGOTIATION"].includes(q.status));
    const pendingCount = pendingList.length;
    const pendingGross = pendingList.reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);

    const wonList = quotations.filter((q) => ["APPROVED", "CONFIRMED", "FULFILLED"].includes(q.status));
    const wonCount = wonList.length;
    const wonGross = wonList.reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);

    const sentList = quotations.filter((q) => ["SENT", "SENT_TO_CUSTOMER"].includes(q.status));
    const sentCount = sentList.length;
    const sentGross = sentList.reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);

    const closedCount = wonCount + quotations.filter((q) => ["REJECTED", "CANCELLED"].includes(q.status)).length;
    const conversionRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    return {
      totalCount,
      totalGross,
      pendingCount,
      pendingGross,
      wonCount,
      wonGross,
      sentCount,
      sentGross,
      conversionRate,
    };
  }, [quotations]);

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuotations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuotations.map((q) => q.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Export to CSV Functionality
  const exportToCSV = () => {
    const exportData = selectedIds.size > 0 
      ? filteredQuotations.filter((q) => selectedIds.has(q.id))
      : filteredQuotations;

    if (exportData.length === 0) {
      showToast("error", "No quotations available to export.");
      return;
    }

    const headers = ["Quote Number", "Customer Name", "Tier", "SalesRep", "Status", "Currency", "Subtotal", "Tax", "Discount", "Grand Total", "Created Date"];
    const rows = exportData.map((q) => [
      q.quoteNumber,
      `"${q.customer?.companyName || "N/A"}"`,
      q.customer?.tier || "BRONZE",
      `"${q.salesRep?.name || "Rep"}"`,
      q.status,
      q.currency,
      q.subtotalAmount,
      q.taxTotal,
      q.discountTotal,
      q.totalAmount,
      new Date(q.createdAt).toISOString().split("T")[0],
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DealFlow360_Quotations_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("success", `Exported ${exportData.length} quotation(s) to CSV!`);
  };

  // Load Slide-over Drawer Details
  const handleOpenDrawer = async (q: Quotation) => {
    setIsDrawerOpen(true);
    setDrawerQuotation(q);
    setLoadingRecommendations(true);
    // Fetch detailed record and recommendations
    const [res, recRes] = await Promise.all([
      apiClient.get<Quotation>(`/quotations/${q.id}`),
      apiClient.get<{ upsell: any[]; crossSell: any[] }>(`/recommendations/quotation/${q.id}`),
    ]);
    if (res.data) {
      setDrawerQuotation(res.data);
    }
    if (recRes.data) {
      setDrawerRecommendations(recRes.data);
    } else {
      setDrawerRecommendations(null);
    }
    setLoadingRecommendations(false);
  };

  const handleAddRecommendedToDrawer = async (productId: string) => {
    if (!drawerQuotation) return;
    const res = await apiClient.post<Quotation>(`/recommendations/quotation/${drawerQuotation.id}/add/${productId}`);
    if (res.data) {
      showToast("success", "Recommended product added to quotation!");
      setDrawerQuotation(res.data);
      fetchQuotations();
      // Refresh recommendations
      const recRes = await apiClient.get<{ upsell: any[]; crossSell: any[] }>(`/recommendations/quotation/${drawerQuotation.id}`);
      if (recRes.data) setDrawerRecommendations(recRes.data);
    } else {
      showToast("error", res.error || "Failed to add recommended product.");
    }
  };

  // Form handlers
  const handleAddLineToDraft = () => {
    if (!selectedProduct) {
      showToast("error", "Please select a product.");
      return;
    }
    if (quantity <= 0) {
      showToast("error", "Quantity must be at least 1.");
      return;
    }

    if (discountFeedback && !discountFeedback.allowed) {
      showToast("error", discountFeedback.reason || "Requested discount exceeds maximum allowed limit.");
      return;
    }

    const unitPrice = resolvedUnitPrice;
    const taxRate = selectedProduct.taxRate || 0;
    const subtotal = unitPrice * quantity;
    const discountAmount = (subtotal * discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxRate) / 100;
    const finalTotal = afterDiscount + taxAmount;

    const newLine: QuotationLine = {
      productId: selectedProduct.id,
      quantity,
      unitPrice,
      discountPercent,
      discountAmount,
      taxRate,
      taxAmount,
      subtotal,
      finalUnitPrice: finalTotal,
      product: selectedProduct,
    };

    setLines([...lines, newLine]);
    setSelectedProductId("");
    setSelectedProduct(null);
    setQuantity(1);
    setDiscountPercent(0);
    setDiscountFeedback(null);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleSaveQuotation = async (shouldSubmit: boolean) => {
    if (!selectedCustomerId) {
      showToast("error", "Please select a customer.");
      return;
    }
    if (lines.length === 0) {
      showToast("error", "Please add at least one product line.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      customerId: selectedCustomerId,
      currency,
      notes: notes.trim() || undefined,
      lines: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        discountPercent: l.discountPercent,
      })),
    };

    const createRes = await apiClient.post<Quotation>("/quotations", payload);

    if (createRes.data) {
      const q = createRes.data;
      if (shouldSubmit) {
        const subRes = await apiClient.post<Quotation>(`/quotations/${q.id}/submit`);
        if (subRes.data) {
          if (subRes.data.status === "APPROVED") {
            showToast("success", `Quotation ${q.quoteNumber} created and AUTO-APPROVED!`);
          } else {
            showToast(
              "success",
              `Quotation ${q.quoteNumber} submitted! PENDING APPROVAL from ${subRes.data.approvalRequests?.[0]?.requiredRole || "Manager"}.`
            );
          }
        } else {
          showToast("error", subRes.error || "Failed to submit quotation.");
        }
      } else {
        showToast("success", `Draft quotation ${q.quoteNumber} saved.`);
      }

      setViewMode("table");
      setSelectedCustomerId("");
      setLines([]);
      setNotes("");
      fetchQuotations();
    } else {
      showToast("error", createRes.error || "Failed to create quotation.");
    }

    setIsSubmitting(false);
  };

  const handleSendQuotation = async (q: Quotation) => {
    const res = await apiClient.post<Quotation>(`/quotations/${q.id}/send`);
    if (res.data) {
      showToast("success", `Quotation ${q.quoteNumber} SENT to customer!`);
      fetchQuotations();
      if (drawerQuotation?.id === q.id) {
        setDrawerQuotation(res.data);
      }
    } else {
      showToast("error", res.error || "Quotation must be APPROVED before sending.");
    }
  };

  const handleCancelQuotation = async (q: Quotation) => {
    if (!confirm(`Are you sure you want to cancel quotation ${q.quoteNumber}?`)) return;

    const res = await apiClient.post<Quotation>(`/quotations/${q.id}/cancel`);
    if (res.data) {
      showToast("success", `Quotation ${q.quoteNumber} cancelled.`);
      fetchQuotations();
      if (drawerQuotation?.id === q.id) {
        setDrawerQuotation(res.data);
      }
    } else {
      showToast("error", res.error || "Failed to cancel quotation.");
    }
  };

  // Status Badge Mapper
  const renderStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case "DRAFT":
        return <StatusBadge type="warning" label="DRAFT" />;
      case "PENDING_APPROVAL":
        return <StatusBadge type="warning" label="PENDING APPROVAL" />;
      case "APPROVED":
        return <StatusBadge type="success" label="APPROVED" />;
      case "SENT":
      case "SENT_TO_CUSTOMER":
        return <StatusBadge type="info" label="SENT TO CUSTOMER" />;
      case "UNDER_NEGOTIATION":
        return <StatusBadge type="primary" label="NEGOTIATING" />;
      case "REJECTED":
        return <StatusBadge type="danger" label="REJECTED" />;
      case "CONFIRMED":
        return <StatusBadge type="success" label="CONFIRMED" />;
      case "FULFILLED":
        return <StatusBadge type="success" label="FULFILLED" />;
      case "CANCELLED":
        return <StatusBadge type="danger" label="CANCELLED" />;
      default:
        return <StatusBadge type="info" label={status} />;
    }
  };

  // Kanban Column Definitions
  const kanbanColumns = [
    {
      id: "drafts",
      title: "Drafts",
      icon: Clock,
      color: "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300",
      statuses: ["DRAFT"],
    },
    {
      id: "pending",
      title: "Approval & Negotiation",
      icon: ShieldCheck,
      color: "border-purple-400 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300",
      statuses: ["PENDING_APPROVAL", "UNDER_NEGOTIATION"],
    },
    {
      id: "approved",
      title: "Approved & Sent",
      icon: Send,
      color: "border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300",
      statuses: ["APPROVED", "SENT", "SENT_TO_CUSTOMER"],
    },
    {
      id: "confirmed",
      title: "Confirmed & Fulfilled",
      icon: CheckCircle2,
      color: "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300",
      statuses: ["CONFIRMED", "FULFILLED"],
    },
    {
      id: "closed",
      title: "Rejected & Cancelled",
      icon: Ban,
      color: "border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300",
      statuses: ["REJECTED", "CANCELLED"],
    },
  ];

  // Totals for active draft form
  const draftSubtotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
  const draftDiscountTotal = lines.reduce((acc, l) => acc + l.discountAmount, 0);
  const draftTaxTotal = lines.reduce((acc, l) => acc + l.taxAmount, 0);
  const draftGrandTotal = lines.reduce((acc, l) => acc + l.finalUnitPrice, 0);

  return (
    <AppLayout>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
            toastMessage.type === "success"
              ? "bg-slate-900 text-emerald-300 border-emerald-500/30"
              : "bg-slate-900 text-rose-300 border-rose-500/30"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {viewMode !== "create" ? (
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            badgeText="Sales & Commercial Operations"
            title="Commercial Quotation Management"
            description="Manage pricing rules, line item discounts, approval workflows, and interactive customer proposal lifecycle."
            actions={
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={exportToCSV}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId("");
                    setLines([]);
                    setNotes("");
                    setViewMode("create");
                  }}
                  className="bg-[#0D69B2] hover:bg-[#0b5a99] active:scale-[0.99] transition-all text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Quotation</span>
                </button>
              </div>
            }
          />

          {/* TOP DASHBOARD STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Total Quotations</span>
                <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0D69B2] flex items-center justify-center">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats.totalCount}</div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">{formatPrice(stats.totalGross)} total</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-xs text-amber-600 font-medium">
                <span>Pending / Negotiation</span>
                <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats.pendingCount}</div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">{formatPrice(stats.pendingGross)} pipeline</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-xs text-emerald-600 font-medium">
                <span>Accepted & Confirmed</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats.wonCount}</div>
              <div className="text-[11px] font-mono text-emerald-600 font-semibold mt-1">{formatPrice(stats.wonGross)} won</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between text-xs text-blue-600 font-medium">
                <span>Sent to Customer</span>
                <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <Send className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats.sentCount}</div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">{formatPrice(stats.sentGross)} active proposal</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 transition-all col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-xs text-purple-600 font-medium">
                <span>Win Conversion Rate</span>
                <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-2">{stats.conversionRate}%</div>
              <div className="text-[11px] text-purple-600 font-medium mt-1">Based on closed deals</div>
            </div>
          </div>

          {/* TOOLBAR, SEARCH & ADVANCED FILTERS */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quote #, customer, email..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                />
              </div>

              {/* Toolbar Controls */}
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 w-full md:w-auto">
                {/* View Switcher Toggle */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "table"
                        ? "bg-white dark:bg-slate-900 text-[#0D69B2] shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("kanban")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === "kanban"
                        ? "bg-white dark:bg-slate-900 text-[#0D69B2] shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Kanban</span>
                  </button>
                </div>

                {/* Status Quick Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="SENT">Sent to Customer</option>
                  <option value="UNDER_NEGOTIATION">Under Negotiation</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                {/* Toggle Filter Panel */}
                <button
                  type="button"
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    showFilterPanel || tierFilter !== "ALL" || minAmount || maxAmount
                      ? "bg-blue-50 dark:bg-blue-950/40 text-[#0D69B2] border-blue-200"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                  {(tierFilter !== "ALL" || minAmount || maxAmount) && (
                    <span className="w-2 h-2 rounded-full bg-[#0D69B2]" />
                  )}
                </button>

                {(searchQuery || statusFilter !== "ALL" || tierFilter !== "ALL" || minAmount || maxAmount) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("ALL");
                      setTierFilter("ALL");
                      setMinAmount("");
                      setMaxAmount("");
                    }}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Filter Panel */}
            {showFilterPanel && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Customer Tier
                  </label>
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="ALL">All Tiers</option>
                    <option value="BRONZE">BRONZE Tier</option>
                    <option value="SILVER">SILVER Tier</option>
                    <option value="GOLD">GOLD Tier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Min Amount
                  </label>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="Min quote value..."
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Max Amount
                  </label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="Max quote value..."
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* BULK ACTIONS BAR (When items selected) */}
          {selectedIds.size > 0 && viewMode === "table" && (
            <div className="bg-[#0D69B2] text-white p-3 rounded-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
                <span className="bg-white/20 px-2.5 py-1 rounded-lg font-mono">
                  {selectedIds.size} quotation(s) selected
                </span>
                <span className="hidden sm:inline text-white/80">Perform bulk operations:</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportToCSV}
                  className="bg-white text-[#0D69B2] hover:bg-blue-50 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* VIEW CONTENT AREA */}
          {loading ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-[#0D69B2] mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">Loading quotations catalog...</p>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="py-16 px-4 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#0D69B2] flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No matching quotations</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
                Try adjusting your search criteria or create a brand new quotation.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerId("");
                  setLines([]);
                  setViewMode("create");
                }}
                className="bg-[#0D69B2] hover:bg-[#0b5a99] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md inline-flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Quotation</span>
              </button>
            </div>
          ) : viewMode === "table" ? (
            /* TABLE VIEW */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4 w-10">
                        <button type="button" onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
                          {selectedIds.size > 0 && selectedIds.size === filteredQuotations.length ? (
                            <CheckSquare className="w-4 h-4 text-[#0D69B2]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th
                        className="p-4 cursor-pointer hover:text-slate-800"
                        onClick={() => {
                          setSortField("quoteNumber");
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        }}
                      >
                        Quote #
                      </th>
                      <th
                        className="p-4 cursor-pointer hover:text-slate-800"
                        onClick={() => {
                          setSortField("customer");
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        }}
                      >
                        Customer & Tier
                      </th>
                      <th className="p-4">Sales Rep</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Subtotal</th>
                      <th
                        className="p-4 cursor-pointer hover:text-slate-800"
                        onClick={() => {
                          setSortField("totalAmount");
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        }}
                      >
                        Grand Total
                      </th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                    {filteredQuotations.map((q) => {
                      const isSelected = selectedIds.has(q.id);
                      return (
                        <tr
                          key={q.id}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) return;
                            handleOpenDrawer(q);
                          }}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                            isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                          }`}
                        >
                          <td className="p-4">
                            <button type="button" onClick={() => toggleSelectOne(q.id)} className="text-slate-400 hover:text-slate-600">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#0D69B2]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0D69B2] flex items-center justify-center font-bold text-xs">
                                <FileSpreadsheet className="w-4 h-4" />
                              </div>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDrawer(q)}
                                  className="font-bold font-mono text-slate-900 dark:text-slate-100 hover:text-[#0D69B2] transition-colors text-left"
                                >
                                  {q.quoteNumber}
                                </button>
                                <div className="text-[11px] text-slate-400">
                                  {new Date(q.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100">{q.customer?.companyName || "N/A"}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-slate-400">{q.customer?.name}</span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold">
                                  {q.customer?.tier || "BRONZE"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 text-slate-600 dark:text-slate-400">
                            {q.salesRep?.name || "Rep"}
                          </td>

                          <td className="p-4">{renderStatusBadge(q.status)}</td>

                          <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                            {formatPrice(q.subtotalAmount, q.currency)}
                          </td>

                          <td className="p-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatPrice(q.totalAmount, q.currency)}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenDrawer(q)}
                                className="p-1.5 rounded-lg text-[#0D69B2] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                title="View Details Drawer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <a
                                href={`/portal?token=${q.portalToken}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Open Customer Portal Link"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>

                              {q.status === "APPROVED" && (
                                <button
                                  type="button"
                                  onClick={() => handleSendQuotation(q)}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Send</span>
                                </button>
                              )}

                              {(q.status === "DRAFT" || q.status === "PENDING_APPROVAL") && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelQuotation(q)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="Cancel Quotation"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* KANBAN BOARD VIEW */
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
              {kanbanColumns.map((col) => {
                const columnQuotes = filteredQuotations.filter((q) => col.statuses.includes(q.status));
                const columnSum = columnQuotes.reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);
                const IconComponent = col.icon;

                return (
                  <div
                    key={col.id}
                    className="bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col min-h-[500px]"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${col.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">{col.title}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {columnQuotes.length}
                      </span>
                    </div>

                    {/* Column Value Sum */}
                    <div className="mb-3 px-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Total: <span className="font-bold text-slate-800 dark:text-slate-200">{formatPrice(columnSum)}</span>
                    </div>

                    {/* Cards List */}
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {columnQuotes.length === 0 ? (
                        <div className="h-32 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400">
                          No quotes in stage
                        </div>
                      ) : (
                        columnQuotes.map((q) => (
                          <div
                            key={q.id}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 shadow-xs hover:shadow-md transition-all space-y-3 group"
                          >
                            <div className="flex items-start justify-between">
                              <button
                                type="button"
                                onClick={() => handleOpenDrawer(q)}
                                className="font-bold font-mono text-xs text-slate-900 dark:text-slate-100 hover:text-[#0D69B2] text-left"
                              >
                                {q.quoteNumber}
                              </button>
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold">
                                {q.customer?.tier || "BRONZE"}
                              </span>
                            </div>

                            <div>
                              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                                {q.customer?.companyName || "N/A"}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">{q.customer?.name}</div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                              <span className="font-bold font-mono text-[#0D69B2]">{formatPrice(q.totalAmount, q.currency)}</span>
                              {renderStatusBadge(q.status)}
                            </div>

                            {/* Card Actions */}
                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDrawer(q)}
                                className="text-[11px] font-semibold text-slate-500 hover:text-[#0D69B2] flex items-center gap-1"
                              >
                                <span>Details</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>

                              <div className="flex items-center gap-1">
                                {q.status === "APPROVED" && (
                                  <button
                                    type="button"
                                    onClick={() => handleSendQuotation(q)}
                                    className="p-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs"
                                    title="Send Quotation"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <a
                                  href={`/portal?token=${q.portalToken}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 text-xs"
                                  title="Portal Proposal"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SLIDE-OVER DETAIL DRAWER */}
          {isDrawerOpen && drawerQuotation && (
            <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
              <div className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col h-full animate-in slide-in-from-right duration-300">
                {/* Drawer Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                        {drawerQuotation.quoteNumber}
                      </h3>
                      {renderStatusBadge(drawerQuotation.status)}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Created on {new Date(drawerQuotation.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setDrawerQuotation(null);
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Action Bar */}
                <div className="p-3 bg-slate-100/60 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 px-5">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/portal?token=${drawerQuotation.portalToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#0D69B2]" />
                      <span>Customer Portal Proposal</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    {drawerQuotation.status === "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => handleSendQuotation(drawerQuotation)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Proposal</span>
                      </button>
                    )}

                    {(drawerQuotation.status === "DRAFT" || drawerQuotation.status === "PENDING_APPROVAL") && (
                      <button
                        type="button"
                        onClick={() => handleCancelQuotation(drawerQuotation)}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold"
                      >
                        Cancel Quote
                      </button>
                    )}
                  </div>
                </div>

                {/* Drawer Navigation Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 bg-white dark:bg-slate-900 gap-6">
                  <button
                    type="button"
                    onClick={() => setDrawerTab("items")}
                    className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
                      drawerTab === "items"
                        ? "border-[#0D69B2] text-[#0D69B2]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Quotation Line Items
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerTab("customer")}
                    className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
                      drawerTab === "customer"
                        ? "border-[#0D69B2] text-[#0D69B2]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Customer Details
                  </button>

                  <button
                    type="button"
                    onClick={() => setDrawerTab("approvals")}
                    className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
                      drawerTab === "approvals"
                        ? "border-[#0D69B2] text-[#0D69B2]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Governance & Approvals
                  </button>
                </div>

                {/* Drawer Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {drawerTab === "items" && (
                    <div className="space-y-6">
                      {/* Items Table */}
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="p-3">Item / SKU</th>
                              <th className="p-3">Unit Price</th>
                              <th className="p-3">Qty</th>
                              <th className="p-3">Discount</th>
                              <th className="p-3 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {drawerQuotation.lines?.map((l, idx) => (
                              <tr key={l.id || idx}>
                                <td className="p-3">
                                  <div className="font-bold text-slate-900 dark:text-slate-100">{l.product?.name || "Product"}</div>
                                  <div className="text-[10px] font-mono text-slate-400">{l.product?.sku}</div>
                                </td>
                                <td className="p-3 font-mono">{formatPrice(l.unitPrice, drawerQuotation.currency)}</td>
                                <td className="p-3 font-bold">{l.quantity}</td>
                                <td className="p-3 font-mono text-rose-600">
                                  {l.discountPercent}% (-{formatPrice(l.discountAmount, drawerQuotation.currency)})
                                </td>
                                <td className="p-3 font-mono font-bold text-right text-slate-900 dark:text-slate-100">
                                  {formatPrice(l.finalUnitPrice, drawerQuotation.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Financial Totals Breakdown */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-end">
                        <div className="w-full sm:w-64 space-y-1.5 text-xs font-mono">
                          <div className="flex justify-between text-slate-500">
                            <span>Subtotal:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {formatPrice(drawerQuotation.subtotalAmount, drawerQuotation.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between text-rose-600">
                            <span>Discount Total:</span>
                            <span className="font-bold">
                              -{formatPrice(drawerQuotation.discountTotal, drawerQuotation.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Tax Total:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              +{formatPrice(drawerQuotation.taxTotal, drawerQuotation.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span>Grand Total:</span>
                            <span className="text-[#0D69B2]">
                              {formatPrice(drawerQuotation.totalAmount, drawerQuotation.currency)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {drawerQuotation.notes && (
                        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 text-xs">
                          <span className="font-bold text-amber-800 dark:text-amber-400 block mb-1">Notes & Terms:</span>
                          <p className="text-amber-900/80 dark:text-amber-200 whitespace-pre-wrap">{drawerQuotation.notes}</p>
                        </div>
                      )}

                      {/* RECOMMENDED FOR THIS QUOTE PANEL */}
                      {drawerRecommendations && (
                        (drawerRecommendations.upsell.length > 0 || drawerRecommendations.crossSell.length > 0) && (
                          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0D69B2] flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-purple-600" />
                                <span>Recommended for this quote</span>
                              </h4>
                              <span className="text-[11px] text-slate-400">Powered by Price List & Governance</span>
                            </div>

                            {/* UPSELL RECOMMENDATIONS */}
                            {drawerRecommendations.upsell.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">
                                  UPSELL RECOMMENDATIONS
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {drawerRecommendations.upsell.map((rec) => (
                                    <div
                                      key={rec.id}
                                      className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-xl flex flex-col justify-between space-y-2"
                                    >
                                      <div>
                                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                          {rec.recommendedProduct.name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          SKU: {rec.recommendedProduct.sku}
                                        </div>
                                        <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium mt-1">
                                          {rec.explanation}
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between pt-2 border-t border-purple-200/60 dark:border-purple-900">
                                        <span className="font-bold font-mono text-xs text-slate-900 dark:text-slate-100">
                                          {formatPrice(rec.resolvedPrice, rec.currency)}
                                        </span>
                                        {rec.alreadyInQuote ? (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-800">
                                            Already in Quote
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleAddRecommendedToDrawer(rec.recommendedProduct.id)}
                                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1"
                                          >
                                            <Plus className="w-3 h-3" />
                                            <span>Add to Quote</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* CROSS-SELL RECOMMENDATIONS */}
                            {drawerRecommendations.crossSell.length > 0 && (
                              <div className="space-y-2 pt-2">
                                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                                  CROSS-SELL RECOMMENDATIONS
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {drawerRecommendations.crossSell.map((rec) => (
                                    <div
                                      key={rec.id}
                                      className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl flex flex-col justify-between space-y-2"
                                    >
                                      <div>
                                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                          {rec.recommendedProduct.name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          SKU: {rec.recommendedProduct.sku}
                                        </div>
                                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-1">
                                          {rec.explanation}
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between pt-2 border-t border-emerald-200/60 dark:border-emerald-900">
                                        <span className="font-bold font-mono text-xs text-slate-900 dark:text-slate-100">
                                          {formatPrice(rec.resolvedPrice, rec.currency)}
                                        </span>
                                        {rec.alreadyInQuote ? (
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-800">
                                            Already in Quote
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleAddRecommendedToDrawer(rec.recommendedProduct.id)}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1"
                                          >
                                            <Plus className="w-3 h-3" />
                                            <span>Add to Quote</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {drawerTab === "customer" && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100">
                            <Building2 className="w-4 h-4 text-[#0D69B2]" />
                            <span>{drawerQuotation.customer?.companyName}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
                            {drawerQuotation.customer?.tier} TIER
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <div>
                            <span className="text-[11px] text-slate-400 block">Contact Person</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{drawerQuotation.customer?.name}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">Email Address</span>
                            <span className="font-mono text-slate-800 dark:text-slate-200">{drawerQuotation.customer?.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                          <User className="w-4 h-4 text-[#0D69B2]" />
                          <span>Assigned Sales Representative</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{drawerQuotation.salesRep?.name || "Rep"}</p>
                      </div>
                    </div>
                  )}

                  {drawerTab === "approvals" && (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[#0D69B2]" />
                          <span>Approval Governance Log</span>
                        </h4>

                        {drawerQuotation.approvalRequests && drawerQuotation.approvalRequests.length > 0 ? (
                          <div className="space-y-2">
                            {drawerQuotation.approvalRequests.map((req: any, i: number) => (
                              <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-slate-200">Required Role: {req.requiredRole}</div>
                                  <div className="text-[11px] text-slate-400">Status: {req.status}</div>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  {req.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500">No active approval requests for this quotation.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CREATE NEW QUOTATION FORM */
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PageHeader
            badgeText="Quotation Builder"
            title="Create Commercial Proposal"
            description="Select customer account, add product lines, apply line-level discounts with real-time governance feedback, and submit."
            actions={
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Quotations</span>
              </button>
            }
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-6 sm:p-8 max-w-5xl mx-auto space-y-8">
            {/* STEP 1: CUSTOMER SELECTION */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D69B2] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-blue-50 dark:bg-blue-950 text-[#0D69B2] inline-flex items-center justify-center text-xs">
                    1
                  </span>
                  <span>Customer Selection & Tier Currency</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Customer Account <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                  >
                    <option value="">-- Choose active customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {formatCustomerOptionLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Quotation Currency
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currency}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>

              {selectedCustomer && (
                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#0D69B2]" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">{getCustomerNameLabel(selectedCustomer)}</span>
                    {getCustomerEmailLabel(selectedCustomer) && (
                      <span className="text-slate-400">({getCustomerEmailLabel(selectedCustomer)})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="text-slate-500">Tier:</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 font-bold">
                      {getCustomerTierLabel(selectedCustomer)} TIER
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: ADD PRODUCT LINES */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D69B2] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-blue-50 dark:bg-blue-950 text-[#0D69B2] inline-flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Add Products & Line Discounts</span>
                </h3>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Product SKU <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      disabled={!selectedCustomer}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2] disabled:opacity-50"
                    >
                      <option value="">-- Select product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — Base: {formatPrice(p.basePrice, p.currency)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tier Price ({currency})
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatPrice(resolvedUnitPrice, currency)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Qty <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D69B2]"
                    />
                  </div>
                </div>

                {/* LIVE DISCOUNT GOVERNANCE FEEDBACK BADGE */}
                {discountFeedback && (
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      !discountFeedback.allowed
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : discountFeedback.requiresApproval
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      <span className="font-semibold">{discountFeedback.reason}</span>
                    </div>
                    <span className="font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-white/60">
                      {!discountFeedback.allowed
                        ? "EXCEEDS MAXIMUM"
                        : discountFeedback.requiresApproval
                        ? `REQUIRES ${discountFeedback.approvalRole}`
                        : "AUTO APPROVED"}
                    </span>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddLineToDraft}
                    disabled={!selectedProduct || (discountFeedback ? !discountFeedback.allowed : false)}
                    className="px-4 py-2 bg-[#0D69B2] hover:bg-[#0b5a99] disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Line to Proposal</span>
                  </button>
                </div>
              </div>

              {/* QUOTATION LINES TABLE */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Unit Price</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Discount</th>
                      <th className="px-4 py-3">Tax</th>
                      <th className="px-4 py-3">Line Total</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          No product lines added yet.
                        </td>
                      </tr>
                    ) : (
                      lines.map((l, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{l.product?.name}</div>
                            <div className="text-[11px] font-mono text-slate-400">SKU: {l.product?.sku}</div>
                          </td>
                          <td className="px-4 py-3 font-mono">{formatPrice(l.unitPrice, currency)}</td>
                          <td className="px-4 py-3 font-mono font-bold">{l.quantity}</td>
                          <td className="px-4 py-3 font-mono text-rose-600">
                            {l.discountPercent}% (-{formatPrice(l.discountAmount, currency)})
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">{l.taxRate}%</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatPrice(l.finalUnitPrice, currency)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(index)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TOTALS & ACTIONS */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-xs font-mono w-full sm:w-auto">
                <div className="flex justify-between sm:justify-start sm:gap-6 text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatPrice(draftSubtotal, currency)}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-6 text-rose-600">
                  <span>Discount:</span>
                  <span className="font-bold">-{formatPrice(draftDiscountTotal, currency)}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-6 text-slate-500">
                  <span>Tax:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">+{formatPrice(draftTaxTotal, currency)}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-6 text-sm font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Grand Total:</span>
                  <span className="text-[#0D69B2]">{formatPrice(draftGrandTotal, currency)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || lines.length === 0}
                  onClick={() => handleSaveQuotation(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#0D69B2] text-[#0D69B2] text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || lines.length === 0}
                  onClick={() => handleSaveQuotation(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#0D69B2] hover:bg-[#0b5a99] text-white text-xs font-semibold shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Submit Proposal</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
