const labels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  resubmitted: "Resubmitted",
  unassigned: "Unassigned",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  exception: "Exception",
  in_stock: "In stock",
  issued: "Issued",
  installed: "Installed",
  returned: "Returned",
  queued: "Queued",
};

export function statusLabel(value: string) {
  return labels[value] ?? value;
}

export function StatusPill({ value }: { value: string }) {
  const tone =
    value === "approved" || value === "completed" || value === "installed"
      ? "bg-primary/20 text-brand"
      : value === "rejected" || value === "exception"
        ? "bg-danger/15 text-danger"
        : value === "draft" || value === "unassigned" || value === "in_stock"
          ? "bg-canvas text-muted"
          : "bg-accent/15 text-accent";
  return <span className={`inline-flex rounded-sm px-2 py-0.5 text-xs font-semibold ${tone}`}>{statusLabel(value)}</span>;
}
