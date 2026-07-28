import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";

import { Providers } from "@/context/Providers";
import { getPlatformSettingsServer } from "@/lib/data/platform-settings-server";
import { siteConfig } from "@/lib/site-config";

import "./globals.css";

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
        {platform.analyticsGaId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${platform.analyticsGaId}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${platform.analyticsGaId}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
