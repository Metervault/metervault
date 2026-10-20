export function LogoMark({ className = "h-8 w-8", label }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role={label ? "img" : undefined} aria-hidden={label ? undefined : true} aria-label={label}>
      <rect width="64" height="64" rx="16" fill="#0A6B74" />
      <circle cx="32" cy="33" r="18" fill="none" stroke="#E7F4F5" strokeWidth="2.5" />
      <path d="M32 16.5c7.2 8.4 11 13.2 11 18.6a11 11 0 1 1-22 0c0-5.4 3.8-10.2 11-18.6z" fill="#E7F4F5" />
      <circle cx="32" cy="36.2" r="3.4" fill="#C4892A" />
    </svg>
  );
}

export function LogoLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="text-lg font-bold leading-none tracking-tight text-ink">
        Meter<span className="text-brand">Vault</span>
      </span>
    </span>
  );
}
