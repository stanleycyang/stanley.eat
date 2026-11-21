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

export const metadata: Metadata = {
  title: "stanley.eat — Interactive 3D Food Gallery & Recipe Vault",
  description:
    "Explore Stanley's favorite comfort dishes as tactile, interactive 3D sculptures — spin, inspect ingredients, explode layers, and cook straight from the recipe vault.",
  keywords: [
    "3D food",
    "recipes",
    "interactive cookbook",
    "stanley.eat",
    "Three.js",
    "React Three Fiber",
  ],
};

export const viewport: Viewport = {
  themeColor: "#FAF7F2",
  width: "device-width",
  initialScale: 1,
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
        {children}
      </body>
    </html>
  );
}
