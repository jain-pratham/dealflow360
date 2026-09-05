"use client";

import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { apiClient } from "@/lib/api-client";
import {
  Package,
  Layers,
  Truck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Warehouse as WarehouseIcon,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

interface FulfillmentAllocation {
  id: string;
  quotationId: string;
  quoteNumber: string;
  customerName: string;
  salesRepName: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  productId: string;
  productName: string;
  allocatedQuantity: number;
  fulfilledQuantity: number;
  isBackorder: boolean;
  status: string;
  createdAt: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  isActive: boolean;
}

interface InventoryItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  productId: string;
  productName: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
}

interface QuotationLine {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

interface ConfirmedQuotation {
  id: string;
  quoteNumber: string;
  status: string;
  totalAmount: number;
  customer: {
    name: string;
    companyName?: string;
  };
  lines: QuotationLine[];
}

export default function FinanceFulfillmentPage() {
  const [allocations, setAllocations] = useState<FulfillmentAllocation[]>([]);
  const [confirmedQuotes, setConfirmedQuotes] = useState<ConfirmedQuotation[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  // Fulfillment Wizard Modal State
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [selectedQuote, setSelectedQuote] = useState<ConfirmedQuotation | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);

  // Manual Allocations Map: lineId -> { [warehouseId]: quantity }
  const [manualAllocationsMap, setManualAllocationsMap] = useState<Record<string, Record<string, number>>>({});
  const [isSubmittingFulfillment, setIsSubmittingFulfillment] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Ship Modal State
  const [shipModalAlloc, setShipModalAlloc] = useState<FulfillmentAllocation | null>(null);
  const [shipQuantity, setShipQuantity] = useState<number>(1);
  const [isShipping, setIsShipping] = useState<boolean>(false);

  const fetchFulfillmentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allocRes, quoteRes, whRes, invRes] = await Promise.all([
        apiClient.get<FulfillmentAllocation[]>("/fulfillment"),
        apiClient.get<ConfirmedQuotation[]>("/quotations"),
        apiClient.get<Warehouse[]>("/warehouses"),
        apiClient.get<InventoryItem[]>("/inventory"),
      ]);

      if (allocRes.error) throw new Error(allocRes.error);
      setAllocations(allocRes.data || []);

      if (quoteRes.data) {
        // /quotations returns paginated { data: [...], meta: {...} }
        const quoteArray: ConfirmedQuotation[] = Array.isArray(quoteRes.data)
          ? quoteRes.data
          : Array.isArray((quoteRes.data as any)?.data)
          ? (quoteRes.data as any).data
          : [];
        const confirmed = quoteArray.filter(
          (q) => q.status === "CONFIRMED" || q.status === "APPROVED"
        );
        setConfirmedQuotes(confirmed);
      }

      if (whRes.data) {
        setWarehouses(whRes.data.filter((w) => w.isActive));
      }

      if (invRes.data) {
        setInventory(invRes.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load fulfillment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFulfillmentData();
  }, []);

  const handleOpenWizard = (quote: ConfirmedQuotation) => {
    setSelectedQuote(quote);
    setSelectedQuoteId(quote.id);
    setIsManualOverride(false);
    setActionSuccessMessage(null);
    setError(null);

    // Pre-populate recommended split in manualAllocationsMap
    const initialMap: Record<string, Record<string, number>> = {};
    const activeWhs = warehouses.length > 0 ? warehouses : [
      { id: "wh-a", name: "Main Distribution Center", code: "WH-A", location: "", isActive: true },
      { id: "wh-b", name: "West Coast Logistics Hub", code: "WH-B", location: "", isActive: true }
    ];

    quote.lines.forEach((line) => {
      initialMap[line.id] = {};
      let remaining = line.quantity;

      activeWhs.forEach((wh) => {
        const inv = inventory.find((i) => i.warehouseId === wh.id && i.productId === line.productId);
        const avail = inv ? Math.max(0, inv.availableQuantity) : 0;
        const alloc = Math.min(remaining, avail);
        initialMap[line.id][wh.id] = alloc;
        remaining -= alloc;
      });
    });

    setManualAllocationsMap(initialMap);
    setIsWizardOpen(true);
  };

  const handleManualQtyChange = (lineId: string, warehouseId: string, value: string) => {
    const qty = Math.max(0, parseInt(value) || 0);
    setManualAllocationsMap((prev) => ({
      ...prev,
      [lineId]: {
        ...(prev[lineId] || {}),
        [warehouseId]: qty,
      },
    }));
  };

  const executeFulfillment = async (override: boolean) => {
    if (!selectedQuote) return;
    setIsSubmittingFulfillment(true);
    setError(null);

    try {
      let bodyPayload: any = undefined;

      if (override) {
        const manualAllocationsPayload = selectedQuote.lines.map((line) => {
          const whAllocs = manualAllocationsMap[line.id] || {};
          const allocationsArray = Object.entries(whAllocs)
            .map(([warehouseId, quantity]) => ({ warehouseId, quantity }))
            .filter((a) => a.quantity > 0);

          return {
            lineId: line.id,
            allocations: allocationsArray,
          };
        });

        bodyPayload = { manualAllocations: manualAllocationsPayload };
      }

      const res = await apiClient.post(`/fulfillment/quotation/${selectedQuote.id}`, bodyPayload);

      if (res.error) {
        throw new Error(res.error);
      }

      setActionSuccessMessage(
        `Fulfillment allocation ${override ? "manual override" : "suggested split"} successfully processed!`
      );
      setTimeout(() => {
        setIsWizardOpen(false);
        fetchFulfillmentData();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to process fulfillment allocation");
    } finally {
      setIsSubmittingFulfillment(false);
    }
  };

  const handleProcessShipment = async () => {
    if (!shipModalAlloc) return;
    setIsShipping(true);
    setError(null);

    try {
      const res = await apiClient.post(`/fulfillment/allocation/${shipModalAlloc.id}/ship`, {
        fulfilledQuantity: shipQuantity,
      });

      if (res.error) throw new Error(res.error);

      setShipModalAlloc(null);
      fetchFulfillmentData();
    } catch (err: any) {
      setError(err.message || "Failed to process shipment");
    } finally {
      setIsShipping(false);
    }
  };

  const columns: Column<FulfillmentAllocation>[] = [
    {
      header: "Allocation / Quote",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{row.quoteNumber}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{row.id.substring(0, 8)}...</div>
        </div>
      ),
    },
    {
      header: "Customer",
      accessorKey: "customerName",
      render: (row) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {row.customerName || "N/A"}
        </span>
      ),
    },
    {
      header: "Product Item",
      accessorKey: "productName",
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{row.productName}</span>
        </div>
      ),
    },
    {
      header: "Fulfillment Hub",
      render: (row) => (
        <div className="flex items-center space-x-1.5">
          <WarehouseIcon className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {row.warehouseCode || row.warehouseName}
          </span>
        </div>
      ),
    },
    {
      header: "Allocated / Fulfilled",
      render: (row) => (
        <div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {row.allocatedQuantity}
          </span>
          <span className="text-xs text-slate-500 ml-1">
            ({row.fulfilledQuantity} shipped)
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      render: (row) => {
        let type: "success" | "warning" | "info" | "danger" = "info";
        if (row.status === "FULFILLED") type = "success";
        if (row.status === "BACKORDERED") type = "warning";
        if (row.status === "PARTIALLY_FULFILLED") type = "info";
        return <StatusBadge type={type} label={row.status} />;
      },
    },
    {
      header: "Actions",
      render: (row) => {
        const unfulfilled = row.allocatedQuantity - row.fulfilledQuantity;
        if (unfulfilled <= 0 || row.isBackorder) {
          return <span className="text-xs text-slate-400 font-medium">Completed / N/A</span>;
        }
        return (
          <button
            onClick={() => {
              setShipModalAlloc(row);
              setShipQuantity(unfulfilled);
            }}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Ship Stock</span>
          </button>
        );
      },
    },
  ];

  const filteredAllocations = allocations.filter((alloc) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      alloc.quoteNumber.toLowerCase().includes(term) ||
      alloc.productName.toLowerCase().includes(term) ||
      alloc.customerName.toLowerCase().includes(term) ||
      alloc.warehouseCode.toLowerCase().includes(term)
    );
  });

  return (
    <AppLayout>
      <PageHeader
        badgeText="Finance & Operations Fulfillment"
        title="Warehouse Allocation & Inventory Fulfillment"
        description="Monitor multi-warehouse shipping allocations, review recommended splits, and execute manual inventory overrides."
      />

      {/* Main Content Layout */}
      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Confirmed Quotations Ready for Fulfillment Banner / Quick Bar */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-900/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                <ShoppingBag className="w-4 h-4" />
                <span>Pending Quotation Fulfillment Queue</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                {confirmedQuotes.length} Confirmed Quotation{confirmedQuotes.length === 1 ? "" : "s"} Ready for Multi-Warehouse Allocation
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Initiate automated split calculations or execute custom warehouse overrides.
              </p>
            </div>

            {confirmedQuotes.length > 0 && (
              <div className="flex items-center space-x-3">
                <select
                  value={selectedQuoteId}
                  onChange={(e) => {
                    const q = confirmedQuotes.find((item) => item.id === e.target.value);
                    if (q) handleOpenWizard(q);
                  }}
                  className="bg-slate-800 border border-slate-700 text-slate-100 text-sm font-medium rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Select Confirmed Quotation...</option>
                  {confirmedQuotes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quoteNumber} - {q.customer?.companyName || q.customer?.name || "Customer"} (${Number(q.totalAmount || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Filters & Search Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by quote #, customer, product, or warehouse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
            />
          </div>

          <button
            onClick={fetchFulfillmentData}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Allocations</span>
          </button>
        </div>

        {/* Fulfillment Allocations Table */}
        {loading ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading real fulfillment allocations...</p>
          </div>
        ) : filteredAllocations.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <Layers className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">No Fulfillment Allocations Found</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              No warehouse stock allocations match your query or have been created yet. Select a confirmed quotation above to initiate multi-warehouse fulfillment.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <DataTable columns={columns} data={filteredAllocations} />
          </div>
        )}
      </div>

      {/* MULTI-WAREHOUSE SPLIT OVERRIDE WIZARD MODAL */}
      {isWizardOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Fulfillment Allocation & Warehouse Split</h3>
                  <p className="text-xs text-slate-300">
                    Quotation: <span className="font-semibold text-indigo-300">{selectedQuote.quoteNumber}</span> | Customer:{" "}
                    <span className="text-slate-200">{selectedQuote.customer?.companyName || selectedQuote.customer?.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {actionSuccessMessage && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{actionSuccessMessage}</span>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Mode Toggle Header */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {isManualOverride ? "Manual Warehouse Split Override" : "Recommended Warehouse Split"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isManualOverride
                      ? "Custom allocation: Edit warehouse quantities. Validation prevents negative stock."
                      : "System automatically calculates optimal warehouse allocation based on priority & available stock."}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsManualOverride(false)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      !isManualOverride
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Recommended Split
                  </button>
                  <button
                    onClick={() => setIsManualOverride(true)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      isManualOverride
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Manual Override
                  </button>
                </div>
              </div>

              {/* Products Breakdown & Warehouse Split Table */}
              {selectedQuote.lines.map((line) => {
                const activeWhs = warehouses.length > 0 ? warehouses : [
                  { id: "wh-a", name: "Main Distribution Center", code: "WH-A", location: "", isActive: true },
                  { id: "wh-b", name: "West Coast Logistics Hub", code: "WH-B", location: "", isActive: true }
                ];

                const lineMap = manualAllocationsMap[line.id] || {};
                const currentTotalAllocated = Object.values(lineMap).reduce((a, b) => a + (Number(b) || 0), 0);
                const backorderQty = Math.max(0, line.quantity - currentTotalAllocated);

                return (
                  <div key={line.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{line.product.sku}</span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{line.product.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500">Requested Quantity:</span>
                        <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">{line.quantity} units</div>
                      </div>
                    </div>

                    {/* Warehouse Split Table Requirement 6 */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2.5 px-3 font-semibold">Warehouse</th>
                            <th className="py-2.5 px-3 font-semibold">Available</th>
                            <th className="py-2.5 px-3 font-semibold">Allocated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {activeWhs.map((wh) => {
                            const inv = inventory.find((i) => i.warehouseId === wh.id && i.productId === line.productId);
                            const avail = inv ? Math.max(0, inv.availableQuantity) : 0;
                            const allocVal = lineMap[wh.id] || 0;

                            return (
                              <tr key={wh.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                                  <div className="flex items-center space-x-1.5">
                                    <WarehouseIcon className="w-3.5 h-3.5 text-blue-500" />
                                    <span>{wh.code} ({wh.name})</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">
                                  <span className={avail > 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                                    {avail}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  {isManualOverride ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max={avail}
                                      value={allocVal}
                                      onChange={(e) => handleManualQtyChange(line.id, wh.id, e.target.value)}
                                      className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    />
                                  ) : (
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded">
                                      {allocVal}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary row per line */}
                    <div className="flex items-center justify-between text-xs pt-2 font-semibold bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                      <span className="text-slate-600 dark:text-slate-400">Total Allocated: <strong className="text-slate-900 dark:text-slate-100">{currentTotalAllocated} / {line.quantity}</strong></span>
                      {backorderQty > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Backorder Required: {backorderQty} units</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Fully Allocated (0 Backorder)</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setIsWizardOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center space-x-3">
                {isManualOverride ? (
                  <button
                    onClick={() => executeFulfillment(true)}
                    disabled={isSubmittingFulfillment}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {isSubmittingFulfillment && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Confirm Manual Override</span>
                  </button>
                ) : (
                  <button
                    onClick={() => executeFulfillment(false)}
                    disabled={isSubmittingFulfillment}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {isSubmittingFulfillment && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>Accept Suggested Split</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SHIPMENT MODAL */}
      {shipModalAlloc && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-600">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Process Physical Shipment</h3>
                <p className="text-xs text-slate-500">Quote: {shipModalAlloc.quoteNumber} | Hub: {shipModalAlloc.warehouseCode}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div>Product: <strong className="text-slate-900 dark:text-slate-100">{shipModalAlloc.productName}</strong></div>
                <div>Allocated Qty: <strong>{shipModalAlloc.allocatedQuantity}</strong> | Already Shipped: <strong>{shipModalAlloc.fulfilledQuantity}</strong></div>
                <div>Remaining Unfulfilled: <strong className="text-emerald-600 font-bold">{shipModalAlloc.allocatedQuantity - shipModalAlloc.fulfilledQuantity}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity to Ship & Deduct Stock:
                </label>
                <input
                  type="number"
                  min="1"
                  max={shipModalAlloc.allocatedQuantity - shipModalAlloc.fulfilledQuantity}
                  value={shipQuantity}
                  onChange={(e) => setShipQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShipModalAlloc(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessShipment}
                disabled={isShipping}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {isShipping && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Shipment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
