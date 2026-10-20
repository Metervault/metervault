type SyncState = "local" | "syncing" | "synced" | "failed";

const label: Record<SyncState, string> = {
  local: "On this phone",
  syncing: "Syncing",
  synced: "Synced",
  failed: "Sync failed",
};

export function SyncPill({ state = "synced" }: { state?: SyncState }) {
  const dot = {
    local: "bg-muted",
    syncing: "bg-accent",
    synced: "bg-primary-dark",
    failed: "bg-danger",
  }[state];

  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
      {label[state]}
    </span>
  );
}
