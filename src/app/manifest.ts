import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#0a8d6e",
    icons: [
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png"
      }
    ]
  };
}
