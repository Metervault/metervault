import type { ReactNode } from "react";

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: { key: string; cells: ReactNode[] }[];
  empty: string;
}) {
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {rows.length === 0 ? (
          <li className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted shadow-sm">{empty}</li>
        ) : (
          rows.map((row) => (
            <li key={row.key} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <p className="text-base font-semibold leading-snug">{row.cells[0]}</p>
              {columns.length > 1 ? (
                <dl className="mt-3 space-y-2.5">
                  {columns.slice(1).map((heading, index) => (
                    <div key={`${row.key}-${heading}`} className="flex items-start justify-between gap-4 text-sm">
                      <dt className="text-muted">{heading}</dt>
                      <dd className="max-w-[60%] text-right font-medium">{row.cells[index + 1]}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          ))
        )}
      </ul>
      <div className="hidden overflow-hidden rounded-lg border border-line bg-surface shadow-sm md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-primary text-on-primary">
            <tr>
              {columns.map((heading) => (
                <th key={heading} className="px-3 py-2 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted" colSpan={columns.length}>
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key} className="border-t border-line hover:bg-canvas">
                  {row.cells.map((cell, index) => (
                    <td key={`${row.key}-${index}`} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
