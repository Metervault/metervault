import { SectionTitle } from "@/components/section-title";
import { EXPORT_HEADERS } from "@/domain/export/headers";
import { INSTALLATION_EXPORT, PREMISE_EXPORT } from "@/domain/export/job";
import { LIST_PHRASES } from "@/domain/export/phrases";
import { METER_CHANGE_V1, fieldsOf } from "@/domain/forms/meter-change-v1";
import { CAPABILITIES, CONTRACT_ROLES, ROLE_MATRIX, type Capability, type ContractRole } from "@/server/auth/access";

const capabilityLabel: Record<Capability, string> = {
  capture_own_draft: "Capture own drafts",
  see_own_jobs: "See own jobs",
  see_contract_jobs: "See every company job",
  see_approved_only: "See approved only",
  edit_submitted: "Edit after submit",
  assign_and_stock: "Assign and stock",
  approve_or_reject: "Approve or reject",
  unlock_approved: "Unlock approved",
  manage_setup: "Team and setup",
  export: "Export",
};

const roleLabel: Record<ContractRole | "org_admin", string> = {
  technician: "Technician",
  supervisor: "Supervisor",
  admin: "Admin",
  client_viewer: "Client viewer",
  org_admin: "Org admin",
};

export default function FormSchemaPage() {
  const fields = fieldsOf(METER_CHANGE_V1);
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Meter change form</SectionTitle>
        <p className="mt-3 max-w-3xl text-sm text-muted">
          Version {METER_CHANGE_V1.version}. This is the meter-change form the field app uses. Managers do not fill it in here.
        </p>
      </div>

      {METER_CHANGE_V1.sections.map((section) => (
        <section key={section.id} className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
          <h2 className="border-b border-line bg-canvas px-4 py-3 text-base font-semibold">{section.title}</h2>
          <ul className="divide-y divide-line md:hidden">
            {section.fields.map((field) => (
              <li key={field.id} className="space-y-1 px-4 py-3">
                <p className="font-semibold">{field.label}</p>
                <p className="text-sm text-muted">{field.type}{field.multiple ? ", multiple" : ""}</p>
                <p className="text-sm">{field.required ? (field.requiredUnless ? "Required unless flagged" : "Required") : "Optional"}</p>
                <p className="text-sm text-muted">{field.exportHeader ?? "Not a column"}</p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-primary text-on-primary">
                <tr>
                  {["Question", "Type", "Required", "Export header"].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.fields.map((field) => (
                  <tr key={field.id} className="border-t border-line align-top">
                    <td className="px-3 py-2 font-medium">{field.label}</td>
                    <td className="px-3 py-2 text-muted">{field.type}{field.multiple ? ", multiple" : ""}</td>
                    <td className="px-3 py-2">{field.required ? (field.requiredUnless ? "Unless flagged" : "Yes") : "No"}</td>
                    <td className="px-3 py-2 text-muted">{field.exportHeader ?? "Not a column"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="section-title text-xl">Stored value to export text</h2>
        <ul className="space-y-3 md:hidden">
          {Object.entries(INSTALLATION_EXPORT).map(([stored, exported]) => (
            <li key={stored} className="rounded-lg border border-line bg-surface p-4 text-sm shadow-sm">
              <p className="font-semibold">Installation</p>
              <p className="mt-1 text-muted">{stored}</p>
              <p className="mt-2">{exported}</p>
            </li>
          ))}
          {Object.entries(PREMISE_EXPORT).map(([stored, exported]) => (
            <li key={stored} className="rounded-lg border border-line bg-surface p-4 text-sm shadow-sm">
              <p className="font-semibold">Premise</p>
              <p className="mt-1 text-muted">{stored}</p>
              <p className="mt-2">{exported}</p>
            </li>
          ))}
          {[
            ["Fault ticked", "true", "Excel boolean true. Unticked is a blank cell."],
            ["Old meter not on list", "flag plus the clean number", `{number}${LIST_PHRASES.oldMeterSuffix}`],
            ["Connection not on list", "flag", `${LIST_PHRASES.connectionValue} in connection (2). Connection (1) stays blank.`],
            ["Approved status", "approved", "Approved jobs export as Final."],
            ["Size, class, type", "contract list", "The field app offers 15mm, Class D, and Ultrasonic."],
            ["Company", "entered on the job", "Entered on the job."],
          ].map(([field, stored, exported]) => (
            <li key={field} className="rounded-lg border border-line bg-surface p-4 text-sm shadow-sm">
              <p className="font-semibold">{field}</p>
              <p className="mt-1 text-muted">{stored}</p>
              <p className="mt-2">{exported}</p>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-sm md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-primary text-on-primary">
              <tr>
                {["Field", "Stored value", "Export cell"].map((heading) => (
                  <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(INSTALLATION_EXPORT).map(([stored, exported]) => (
                <tr key={stored} className="border-t border-line">
                  <td className="px-3 py-2">Installation</td>
                  <td className="px-3 py-2">{stored}</td>
                  <td className="px-3 py-2">{exported}</td>
                </tr>
              ))}
              {Object.entries(PREMISE_EXPORT).map(([stored, exported]) => (
                <tr key={stored} className="border-t border-line">
                  <td className="px-3 py-2">Premise</td>
                  <td className="px-3 py-2">{stored}</td>
                  <td className="px-3 py-2">{exported}</td>
                </tr>
              ))}
              <tr className="border-t border-line">
                <td className="px-3 py-2">Fault ticked</td>
                <td className="px-3 py-2">true</td>
                <td className="px-3 py-2">Excel boolean true. Unticked is a blank cell.</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2">Old meter not on list</td>
                <td className="px-3 py-2">flag plus the clean number</td>
                <td className="px-3 py-2">{`{number}${LIST_PHRASES.oldMeterSuffix}`}</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2">Connection not on list</td>
                <td className="px-3 py-2">flag</td>
                <td className="px-3 py-2">{LIST_PHRASES.connectionValue} in connection (2). Connection (1) stays blank.</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2">Approved status</td>
                <td className="px-3 py-2">approved</td>
                <td className="px-3 py-2">Approved jobs export as Final.</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2">Size, class, type</td>
                <td className="px-3 py-2">contract list</td>
                <td className="px-3 py-2">The field app offers 15mm, Class D, and Ultrasonic.</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2">Company</td>
                <td className="px-3 py-2">entered on the job</td>
                <td className="px-3 py-2">Entered on the job.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">{fields.length} questions. {EXPORT_HEADERS.length} export columns, sheet Main.</p>
      </section>

      <section className="space-y-3">
        <h2 className="section-title text-xl">Roles</h2>
        <ul className="space-y-3 md:hidden">
          {CAPABILITIES.map((capability) => (
            <li key={capability} className="rounded-lg border border-line bg-surface p-4 shadow-sm">
              <p className="font-semibold">{capabilityLabel[capability]}</p>
              <dl className="mt-3 space-y-2 text-sm">
                {(["technician", "supervisor", "admin", "client_viewer", "org_admin"] as const).map((role) => (
                  <div key={role} className="flex items-center justify-between gap-4">
                    <dt className="text-muted">{roleLabel[role]}</dt>
                    <dd className="font-semibold">{ROLE_MATRIX[role][capability] ? "Yes" : "—"}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-sm md:block">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-primary text-on-primary">
              <tr>
                <th className="px-3 py-2 font-semibold">Can</th>
                {(["technician", "supervisor", "admin", "client_viewer", "org_admin"] as const).map((role) => (
                  <th key={role} className="px-3 py-2 font-semibold">{roleLabel[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((capability) => (
                <tr key={capability} className="border-t border-line">
                  <td className="px-3 py-2">{capabilityLabel[capability]}</td>
                  {(["technician", "supervisor", "admin", "client_viewer", "org_admin"] as const).map((role) => (
                    <td key={role} className="px-3 py-2">{ROLE_MATRIX[role][capability] ? "Yes" : "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="max-w-3xl text-sm text-muted">
          Managers approve captures. Field installers submit them. {CONTRACT_ROLES.length} older role names are listed above for reference.
        </p>
      </section>
    </div>
  );
}
