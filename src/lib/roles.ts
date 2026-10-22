export type OrgRole = "head" | "admin" | "member";

export function isOfficeRole(role: string): role is "head" | "admin" {
  return role === "head" || role === "admin";
}

export function roleLabel(role: string) {
  if (role === "head") return "Head manager";
  if (role === "admin") return "Manager";
  return "Field";
}
