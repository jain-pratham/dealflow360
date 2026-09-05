"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import {
  Truck,
  Package,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  Send,
  Loader2,
} from "lucide-react";

interface AllocationItem {
  id: string;
  quotationId: string;
  quoteNumber: string;
  customerName: string;
  salesRepName: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode?: string;
  productId: string;
  productName: string;
  allocatedQuantity: number;
  fulfilledQuantity: number;
  isBackorder: boolean;
  status: string;
  createdAt: string;
}

export default function SalesFulfillmentPage() {
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal states
  const [isFulfillModalOpen, setIsFulfillModalOpen] = useState(false);
  const [targetQuotationId, setTargetQuotationId] = useState("");
  const [creatingFulfillment, setCreatingFulfillment] = useState(false);

  const [shippingAllocation, setShippingAllocation] = useState<AllocationItem | null>(null);
  const [shipQty, setShipQty] = useState<number>(1);
  const [processingShipment, setProcessingShipment] = useState(false);

  const fetchFulfillments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await apiClient.get<AllocationItem[]>("/fulfillment", params);
      if (res.error) {
        setError(res.error);
      } else {
        setAllocations(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load fulfillment allocations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFulfillments();
  }, [search, statusFilter]);

  const handleCreateFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetQuotationId.trim()) return;

    setCreatingFulfillment(true);
    setError(null);
    try {
      const res = await apiClient.post(`/fulfillment/quotation/${targetQuotationId.trim()}`);
      if (res.error) {
        setError(res.error);
      } else {
        setIsFulfillModalOpen(false);
        setTargetQuotationId("");
        fetchFulfillments();
      }
    } catch (err: any) {
      setError(err.message || "Failed to create fulfillment.");
    } finally {
      setCreatingFulfillment(false);
    }
  };

  const handleProcessShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAllocation) return;

    setProcessingShipment(true);
    setError(null);
    try {
      const res = await apiClient.post(
        `/fulfillment/allocation/${shippingAllocation.id}/ship`,
        { fulfilledQuantity: Number(shipQty) }
      );
      if (res.error) {
        setError(res.error);
      } else {
        setShippingAllocation(null);
        fetchFulfillments();
      }
    } catch (err: any) {
      setError(err.message || "Failed to process shipment.");
    } finally {
      setProcessingShipment(false);
    }
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedQuantity, 0);
  const totalFulfilled = allocations.reduce((sum, a) => sum + a.fulfilledQuantity, 0);
  const pendingShipmentCount = allocations.filter(
    (a) => a.allocatedQuantity > a.fulfilledQuantity && !a.isBackorder
  ).length;
  const backorderCount = allocations.filter((a) => a.isBackorder).length;

  const columns: Column<AllocationItem>[] = [
    {
      header: "Quotation Ref",
      accessorKey: "quoteNumber",
    },
    {
      header: "Customer",
      accessorKey: "customerName",
    },
    {
      header: "Product Item",
      accessorKey: "productName",
    },
    {
      header: "Warehouse Hub",
      render: (row) => `${row.warehouseName} (${row.warehouseCode || "HUB"})`,
    },
    {
      header: "Allocated",
      accessorKey: "allocatedQuantity",
    },
    {
      header: "Fulfilled / Shipped",
      render: (row) => `${row.fulfilledQuantity} / ${row.allocatedQuantity}`,
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={
            row.status === "FULFILLED"
              ? "success"
              : row.status === "PARTIALLY_FULFILLED" || row.status === "ALLOCATED"
              ? "primary"
              : "warning"
          }
          label={row.status}
        />
      ),
    },
    {
      header: "Actions",
      render: (row) =>
        row.allocatedQuantity > row.fulfilledQuantity && !row.isBackorder ? (
          <button
            onClick={() => {
              setShippingAllocation(row);
              setShipQty(row.allocatedQuantity - row.fulfilledQuantity);
            }}
            className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
          >
            <Truck size={14} />
            <span>Process Ship</span>
          </button>
        ) : (
          <span className="text-xs text-slate-400 italic">No action</span>
        ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Logistics & Fulfillment Engine"
        title="Quotation Fulfillment & Warehouse Allocation"
        description="Calculate multi-warehouse stock allocations, ship reserved inventory, and monitor backorders."
        actions={
          <button
            onClick={() => setIsFulfillModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Initiate Quotation Fulfillment</span>
          </button>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Allocated Units
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {totalAllocated}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Layers size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Shipment
            </div>
            <div className="text-3xl font-extrabold text-amber-500 mt-1">
              {pendingShipmentCount}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fulfilled / Shipped
            </div>
            <div className="text-3xl font-extrabold text-emerald-500 mt-1">
              {totalFulfilled}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Backorders
            </div>
            <div className="text-3xl font-extrabold text-red-500 mt-1">
              {backorderCount}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <Package size={22} />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search quotation, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchFulfillments}
              className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading fulfillment allocations...</div>
        ) : allocations.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <Package size={40} className="mx-auto text-slate-400 mb-3 opacity-50" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">No Fulfillment Records Found</h4>
          </div>
        ) : (
          <DataTable columns={columns} data={allocations} />
        )}
      </div>

      {/* Modal: Initiate Fulfillment */}
      {isFulfillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck size={20} className="text-blue-500" />
              Initiate Quotation Fulfillment
            </h3>
            <p className="text-xs text-slate-500">
              Enter a confirmed Quotation ID to trigger automatic multi-warehouse stock allocation & backorder calculation.
            </p>

            <form onSubmit={handleCreateFulfillment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Quotation ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste Quotation UUID or Quote Number"
                  value={targetQuotationId}
                  onChange={(e) => setTargetQuotationId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFulfillModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFulfillment || !targetQuotationId.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center space-x-2"
                >
                  {creatingFulfillment ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  <span>Calculate & Allocate Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Process Shipment */}
      {shippingAllocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck size={20} className="text-blue-500" />
              Process Physical Shipment
            </h3>
            <p className="text-xs text-slate-500">
              Ship allocated units from warehouse <span className="font-bold text-white">{shippingAllocation.warehouseName}</span> for quotation <span className="font-bold text-white">{shippingAllocation.quoteNumber}</span>.
            </p>

            <form onSubmit={handleProcessShipment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Shipment Quantity (Max {shippingAllocation.allocatedQuantity - shippingAllocation.fulfilledQuantity})
                </label>
                <input
                  type="number"
                  min="1"
                  max={shippingAllocation.allocatedQuantity - shippingAllocation.fulfilledQuantity}
                  value={shipQty}
                  onChange={(e) => setShipQty(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShippingAllocation(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingShipment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center space-x-2"
                >
                  {processingShipment ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <span>Confirm Shipment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
