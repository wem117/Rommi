import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";

import { Providers } from "@/context/Providers";
import { getPlatformSettingsServer } from "@/lib/data/platform-settings-server";
import { siteConfig } from "@/lib/site-config";

import "./globals.css";

/**
 * A GA4 measurement ID always looks like `G-XXXXXXXXXX`. Validating the shape
 * before rendering is defense in depth against the admin-controlled value ever
 * containing anything other than an ID — it is interpolated into both a script
 * `src` URL and an inline `<script>` body, so a malformed/malicious value must
 * never reach either sink.
 */
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/i;

// Default freshness for every route that doesn't declare its own `revalidate`/
// `dynamic` config. The root layout reads admin-controlled platform settings
// (site name, SEO copy, and the Google Analytics ID below) via
// getPlatformSettingsServer(). Without this, a route with no explicit config of
// its own (e.g. /sign-in, /terms, /admin) is eligible for the full-route static
// cache, freezing whatever settings value existed at the last `next build` —
// so an admin editing the GA ID would see it take effect only after a full
// redeploy, not within minutes. 120s matches the homepage's existing cadence.
export const revalidate = 120;

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap"
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap"
});

export async function generateMetadata(): Promise<Metadata> {
  const platform = await getPlatformSettingsServer();
  const siteName = platform.siteName || siteConfig.name;
  const title = platform.seoTitle || `${siteName} — Student Roommates & Rooms in Kazakhstan`;
  const description = platform.seoDescription || siteConfig.description;

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: title,
      template: `%s · ${siteName}`
    },
    description,
    keywords: [...siteConfig.keywords],
    applicationName: siteName,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    alternates: {
      canonical: "/"
    },
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      url: siteConfig.url,
      locale: siteConfig.locale,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: siteName
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.ogImage]
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1
      }
    }
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#16110f" }
  ],
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const platform = await getPlatformSettingsServer();
  const siteName = platform.siteName || siteConfig.name;

  // Only load Analytics in production, with a validated ID from the admin
  // panel — never hardcoded, never sent from local/dev environments, never
  // rendered for a malformed value.
  const gaId = platform.analyticsGaId.trim();
  const analyticsEnabled =
    process.env.NODE_ENV === "production" && Boolean(gaId) && GA_MEASUREMENT_ID_PATTERN.test(gaId);

  // Organization + WebSite structured data for rich results. Kept minimal and
  // truthful: only identity fields we actually control.
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: siteName,
        url: siteConfig.url,
        logo: `${siteConfig.url}/icon`,
        ...(platform.contactEmail ? { email: platform.contactEmail } : {})
      },
      {
        "@type": "WebSite",
        name: siteName,
        url: siteConfig.url,
        description: platform.seoDescription || siteConfig.description
      }
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable}`}>
        {analyticsEnabled ? (
          <>
            {/*
              Rendered as plain, literal <script> elements — deliberately NOT
              next/script. next/script's default and lazy strategies
              (afterInteractive/lazyOnload) never appear as a real, executable
              <script> tag in the server-rendered HTML; Next only serializes
              their config into the React Server Components hydration payload
              and injects the actual tag via client-side JavaScript after
              hydration. Any crawler-based tag checker that inspects raw HTML
              (including Google's own "tag not detected" verifier) never sees a
              tag that only materializes post-hydration.
              A plain <script async src=...> — Google's own official gtag.js
              installation snippet — is written directly into the initial HTML
              by Next (same mechanism as the JSON-LD script above), is visible
              to any HTML-inspecting crawler immediately, and `async` keeps it
              non-render-blocking, so this costs nothing in Lighthouse/TTI
              versus the previous approach.
            */}
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              id="ga-init"
              // gaId is validated against GA_MEASUREMENT_ID_PATTERN above, so it
              // cannot contain characters that would break out of this script.
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`
              }}
            />
          </>
        ) : null}
        {/* Keyboard/screen-reader users can jump past the nav straight to content. */}
        <a
          href="#main-content"
          className="sr-only rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
        >
          Skip to content
        </a>
        <script
          type="application/ld+json"
          // Escape "<" so admin-editable strings can never close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
