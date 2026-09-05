"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import { DataTable, StatusBadge, Column } from "@/components/ui/DataTable";
import { Building2, MapPin, Plus, Edit, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface WarehouseRecord {
  id: string;
  name: string;
  code?: string;
  location: string;
  shippingCostWeighting: number;
  isActive: boolean;
  _count?: {
    inventoryItems: number;
    allocations: number;
  };
}

export default function AdminWarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseRecord | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [shippingCostWeighting, setShippingCostWeighting] = useState<number>(1.0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWarehouses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<WarehouseRecord[]>("/warehouses");
      if (res.error) {
        setError(res.error);
      } else {
        setWarehouses(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load warehouses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleOpenModal = (wh?: WarehouseRecord) => {
    if (wh) {
      setEditingWarehouse(wh);
      setName(wh.name);
      setCode(wh.code || "");
      setLocation(wh.location);
      setShippingCostWeighting(wh.shippingCostWeighting);
      setIsActive(wh.isActive);
    } else {
      setEditingWarehouse(null);
      setName("");
      setCode("");
      setLocation("");
      setShippingCostWeighting(1.0);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name,
      code,
      location,
      shippingCostWeighting: Number(shippingCostWeighting),
      isActive,
    };

    try {
      let res;
      if (editingWarehouse) {
        res = await apiClient.patch(`/warehouses/${editingWarehouse.id}`, payload);
      } else {
        res = await apiClient.post("/warehouses", payload);
      }

      if (res.error) {
        setError(res.error);
      } else {
        setIsModalOpen(false);
        fetchWarehouses();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save warehouse.");
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<WarehouseRecord>[] = [
    {
      header: "Hub Code",
      render: (row) => <span className="font-bold text-blue-600 dark:text-blue-400">{row.code || row.name.substring(0, 4).toUpperCase()}</span>,
    },
    { header: "Warehouse Name", accessorKey: "name" },
    {
      header: "Location",
      render: (row) => (
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <MapPin size={14} className="text-slate-400" />
          {row.location}
        </span>
      ),
    },
    {
      header: "Priority / Weighting",
      render: (row) => `${Number(row.shippingCostWeighting).toFixed(2)}x`,
    },
    {
      header: "Stock SKUs",
      render: (row) => row._count?.inventoryItems || 0,
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge
          type={row.isActive ? "success" : "warning"}
          label={row.isActive ? "Active" : "Inactive"}
        />
      ),
    },
    {
      header: "Actions",
      render: (row) => (
        <button
          onClick={() => handleOpenModal(row)}
          className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
        >
          <Edit size={14} />
          <span>Edit</span>
        </button>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        badgeText="Logistics Setup"
        title="Multi-Warehouse & Fulfillment Hubs Setup"
        description="Configure regional fulfillment hubs, priority order, and active shipping weightings."
        actions={
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add Warehouse Hub</span>
          </button>
        }
      />

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-medium">Loading warehouses...</div>
      ) : (
        <DataTable columns={columns} data={warehouses} />
      )}

      {/* Modal: Add/Edit Warehouse */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 size={20} className="text-blue-500" />
              {editingWarehouse ? "Edit Warehouse Hub" : "Add Warehouse Hub"}
            </h3>

            <form onSubmit={handleSaveWarehouse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Warehouse Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Distribution Center"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Warehouse Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WH-A"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Physical Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New York, USA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Priority / Weighting (Lower = Higher Priority)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={shippingCostWeighting}
                  onChange={(e) => setShippingCostWeighting(parseFloat(e.target.value) || 1.0)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-xs font-semibold text-slate-300">
                  Active (Participates in automatic fulfillment allocation)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center space-x-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Save Warehouse</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
