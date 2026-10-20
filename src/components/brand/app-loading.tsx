import { LogoMark } from "@/components/brand/logo";

export function AppLoading({ label = "Loading", full = false }: { label?: string; full?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={
        full
          ? "flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-ink"
          : "flex min-h-[52vh] flex-col items-center justify-center px-6 py-16 text-ink"
      }
    >
      <div className="relative h-[4.5rem] w-[4.5rem]">
        <svg className="mv-loader-ring absolute inset-0 h-full w-full" viewBox="0 0 80 80" aria-hidden>
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--line)" strokeWidth="4" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="56 158"
          />
          <circle cx="40" cy="6" r="3.2" fill="#C4892A" />
        </svg>
        <div className="mv-loader-mark absolute inset-0 flex items-center justify-center">
          <LogoMark className="h-11 w-11" />
        </div>
      </div>
      {full ? (
        <p className="mt-5 text-lg font-bold tracking-tight">
          Meter<span className="text-brand">Vault</span>
        </p>
      ) : null}
      <p className="mt-2 text-sm font-semibold text-muted">{label}</p>
    </div>
  );
}
