import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.fieldAppName,
    short_name: BRAND.name,
    description: BRAND.fieldDescription,
    start_url: "/field",
    display: "standalone",
    background_color: BRAND.backgroundColor,
    theme_color: BRAND.themeColor,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-192-any.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-any.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
