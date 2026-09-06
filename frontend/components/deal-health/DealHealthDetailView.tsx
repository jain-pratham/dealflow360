import React, { useState } from 'react';
import { DealHealthScoreBadge } from './DealHealthScoreBadge';
import { AlertTriangle, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Alert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  isResolved: boolean;
  createdAt: string;
}

interface DealHealthData {
  quotationId: string;
  score: number;
  status: string;
  alerts: Alert[];
}

export function DealHealthDetailView({ data, onResolve }: { data: DealHealthData, onResolve?: () => void }) {
  const [resolving, setResolving] = useState<string | null>(null);

  const handleResolve = async (alertId: string) => {
    setResolving(alertId);
    try {
      await apiClient.patch(`/deal-health/alerts/${alertId}/resolve`, {});
      if (onResolve) onResolve();
    } finally {
      setResolving(null);
    }
  };

  const getRecommendation = (type: string) => {
    switch (type) {
      case 'HIGH_DISCOUNT':
      case 'DISCOUNT_ANOMALY':
        return "Review discount approval and margin before confirming the deal.";
      case 'APPROVAL_DELAY':
        return "Follow up with the assigned approver.";
      case 'NEGOTIATION_ESCALATION':
        return "Review customer change requests and finalize commercial terms.";
      case 'QUOTE_AGING':
      case 'STALLED_DEAL':
        return "Contact the customer and close or update the quotation.";
      case 'STOCK_SHORTAGE':
      case 'DELIVERY_SLIPPAGE':
        return "Review warehouse allocation or expected replenishment.";
      case 'PAYMENT_DELAY':
        return "Follow up on outstanding payment.";
      case 'PAYMENT_FAILURE':
        return "Ask the customer to retry payment or use another payment method.";
      case 'SUBSCRIPTION_BILLING_RISK':
        return "Review the recurring billing schedule.";
      default:
        return "Review the deal for further action.";
    }
  };

  const score = data?.score ?? 100;
  const status = data?.status ?? 'HEALTHY';
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Health Assessment</h3>
          <p className="text-xs text-slate-500 mt-1">Real-time risk evaluation based on 7 factors.</p>
        </div>
        <DealHealthScoreBadge score={score} status={status} size="lg" />
      </div>

      {alerts.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-emerald-200 bg-emerald-50 rounded-xl text-emerald-700">
          <CheckCircle2 size={32} className="mx-auto mb-3 opacity-50" />
          <h4 className="font-bold">Deal is Healthy</h4>
          <p className="text-sm opacity-80 mt-1">No active risk factors detected.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white border-b pb-2">Active Alerts & Recommendations</h4>
          <div className="grid gap-3">
            {alerts.map(alert => (
              <div key={alert.id} className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    <AlertTriangle size={18} className="text-red-500 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm text-red-700 dark:text-red-400">{alert.title}</div>
                      <div className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{alert.message}</div>
                      
                      <div className="mt-3 flex items-start gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                        <ChevronRight size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                        <span><strong>Action:</strong> {getRecommendation(alert.alertType)}</span>
                      </div>
                    </div>
                  </div>
                  {onResolve && (
                    <button 
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolving === alert.id}
                      className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors flex items-center gap-1"
                    >
                      {resolving === alert.id ? 'Resolving...' : <><Check size={12} /> Resolve</>}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
