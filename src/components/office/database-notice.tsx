import { SectionTitle } from "@/components/section-title";
import { safeDbMessage } from "@/server/db/client";

export function DatabaseNotice({ title, error }: { title: string; error: unknown }) {
  return (
    <div className="space-y-3">
      <SectionTitle>{title}</SectionTitle>
      <p className="max-w-xl text-sm text-danger">{safeDbMessage(error)}</p>
    </div>
  );
}
