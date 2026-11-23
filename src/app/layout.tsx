import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

const SITE_URL = "https://www.stanley.eat";
const SITE_TITLE = "stanley.eat — Stanley's Favorite Restaurants & Eating Journey";
const SITE_DESCRIPTION =
  "Stanley Yang's eating journey across 14 favorite Bay Area restaurants — what to order, when to go, interactive map, and 7 signature dishes in 3D.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  authors: [{ name: "Stanley Yang", url: "https://stanleycyang.com" }],
  creator: "Stanley Yang",
  keywords: [
    "stanley.eat",
    "Stanley Yang",
    "Bay Area restaurants",
    "Cupertino restaurants",
    "San Francisco food guide",
    "eating journey",
    "3D food",
    "interactive cookbook",
  ],
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "stanley.eat",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "stanley.eat",
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "stanley.eat — Stanley's Eating Journey: 14 Favorite Bay Area Restaurants & 7 Dishes in 3D",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@stanleycyang",
    creator: "@stanleycyang",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
  width: "device-width",
  initialScale: 1,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "stanley.eat",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  author: {
    "@type": "Person",
    name: "Stanley Yang",
    url: "https://stanleycyang.com",
    sameAs: [
      "https://stanleycyang.com",
      "https://github.com/stanleycyang",
      "https://x.com/stanleycyang",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plusJakartaSans.variable} ${jetBrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#FAF7F2] text-[#1C1917] font-sans antialiased selection:bg-[#D9381E]/15 selection:text-[#D9381E]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
