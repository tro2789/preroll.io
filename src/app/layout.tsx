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
  title: "preroll.io",
  description: "Podcast production management platform",
};

export const viewport: Viewport = {
  viewportFit: "cover",
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
