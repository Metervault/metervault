import { z } from "zod";
import { fieldsOf } from "./meter-change-v1";
import type { Answers, FormDefinition, FormField } from "./types";

function fieldSchema(field: FormField) {
  switch (field.type) {
    case "boolean":
      return z.boolean();
    case "integer":
      return z.number().int();
    case "date":
      return z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    case "select": {
      const values = field.options?.map((option) => option.value) ?? [];
      return z.string().refine((value) => values.includes(value));
    }
    case "photo":
      return field.multiple ? z.array(z.string().min(1)).min(1) : z.string().min(1);
    default:
      return z.string().trim().min(1);
  }
}

export type FieldIssue = {
  fieldId: string;
  label: string;
  severity: "block" | "warn";
  message: string;
};

function present(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return !Number.isNaN(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function asString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function checkPattern(field: FormField, value: unknown, issues: FieldIssue[]) {
  const text = asString(value);
  if (text == null) return;
  if (field.pattern && !new RegExp(field.pattern.source).test(text.toUpperCase())) {
    issues.push({ fieldId: field.id, label: field.label, severity: field.pattern.severity, message: field.pattern.message });
  }
  if (field.forbidPattern && new RegExp(field.forbidPattern.source).test(text)) {
    issues.push({ fieldId: field.id, label: field.label, severity: field.forbidPattern.severity, message: field.forbidPattern.message });
  }
}

export function validateForm(form: FormDefinition, answers: Answers, mode: "draft" | "submit"): FieldIssue[] {
  const issues: FieldIssue[] = [];
  for (const field of fieldsOf(form)) {
    const value = answers[field.id];
    if (mode === "submit" && field.required) {
      const waived = field.requiredUnless ? answers[field.requiredUnless] === true : false;
      if (!waived && !present(value)) {
        issues.push({ fieldId: field.id, label: field.label, severity: "block", message: `${field.label} is required.` });
        continue;
      }
    }
    if (!present(value)) continue;
    if (!fieldSchema(field).safeParse(value).success) {
      issues.push({ fieldId: field.id, label: field.label, severity: "block", message: `${field.label} is not a valid ${field.type}.` });
      continue;
    }
    checkPattern(field, value, issues);
  }
  return issues;
}

export function blockingIssues(issues: FieldIssue[]) {
  return issues.filter((issue) => issue.severity === "block");
}
