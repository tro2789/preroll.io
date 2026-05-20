import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { RootProvider } from 'fumadocs-ui/provider/next';
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PreRoll.io — Podcast Production Management for Agencies",
    template: "%s | PreRoll.io",
  },
  description:
    "Manage podcast production for multiple clients in one platform. Episode pipelines, asset management, client portals, AI-powered show notes, and publishing — built for podcast agencies and producers.",
  metadataBase: new URL("https://preroll.io"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PreRoll.io",
    title: "PreRoll.io — Podcast Production Management for Agencies",
    description:
      "Manage podcast production for multiple clients in one platform. Episode pipelines, asset management, client portals, and publishing.",
    url: "https://preroll.io",
  },
  twitter: {
    card: "summary_large_image",
    title: "PreRoll.io — Podcast Production Management for Agencies",
    description:
      "Manage podcast production for multiple clients in one platform. Episode pipelines, asset management, client portals, and publishing.",
  },
  alternates: {
    canonical: "https://preroll.io",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#1a1a1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(sora.variable, inter.variable, "font-sans")} suppressHydrationWarning>
      <body className="antialiased">
        <RootProvider
          theme={{
            defaultTheme: 'dark',
            forcedTheme: 'dark',
          }}
          search={{ enabled: false }}
        >
          {children}
          <Toaster position="top-center" />
        </RootProvider>
      </body>
    </html>
  );
}
