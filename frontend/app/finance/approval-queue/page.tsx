"use client";

import ApprovalQueueView from "@/components/approvals/ApprovalQueueView";

export default function FinanceApprovalQueuePage() {
  return (
    <ApprovalQueueView
      roleRequired="FINANCE"
      title="Finance Approval Queue"
    />
  );
}
