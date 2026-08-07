import type { Metadata } from "next";

import { siteConfig } from "@/lib/site-config";

import UniversitiesClient from "./universities-client";

/**
 * Server wrapper around the client page.
 *
 * It exists for one reason: a `"use client"` module cannot export `metadata`,
 * so this page inherited the ROOT layout's `alternates.canonical = "/"` and
 * told Google it was a duplicate of the homepage — while sitemap.xml submitted
 * it as a page of its own. The canonical wins that argument, so the page was
 * effectively unindexable.
 *
 * Same split /rooms and /roommates already use.
 */
export const metadata: Metadata = {
  title: "Universities in Kazakhstan · Student housing near campus",
  description:
    "Browse Kazakhstani universities and find student rooms, apartments and roommates near each campus — SDU, KBTU, Narxoz, KIMEP, Nazarbayev University and more.",
  alternates: { canonical: "/universities" },
  openGraph: {
    title: "Universities in Kazakhstan · Student housing near campus",
    description:
      "Find student rooms, apartments and roommates near every major Kazakhstani university.",
    url: `${siteConfig.url}/universities`,
    type: "website"
  }
};

export default function UniversitiesPage() {
  return <UniversitiesClient />;
}
