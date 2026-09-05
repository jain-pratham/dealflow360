"use client";

import ApprovalQueueView from "@/components/approvals/ApprovalQueueView";

export default function ManagerApprovalQueuePage() {
  return (
    <ApprovalQueueView
      roleRequired="SALES_MANAGER"
      title="Manager Approval Queue"
    />
  );
}
