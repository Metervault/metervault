import { STORAGE } from "@/lib/brand";

export type TechProfile = { username: string; name: string };

const KEY = STORAGE.tech;

export function readTechProfile(): TechProfile {
  if (typeof window === "undefined") return { username: "tech", name: "Technician" };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { username: "tech", name: "Technician" };
    const parsed = JSON.parse(raw) as TechProfile;
    if (!parsed.username || !parsed.name) return { username: "tech", name: "Technician" };
    return parsed;
  } catch {
    return { username: "tech", name: "Technician" };
  }
}

export function writeTechProfile(profile: TechProfile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function syncPaused() {
  return typeof window !== "undefined" && localStorage.getItem(STORAGE.pauseSync) === "on";
}

export function setSyncPaused(paused: boolean) {
  localStorage.setItem(STORAGE.pauseSync, paused ? "on" : "off");
}
