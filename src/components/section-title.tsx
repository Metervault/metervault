import type { ReactNode } from "react";

export function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`section-title text-2xl ${className}`}>{children}</h1>;
}
