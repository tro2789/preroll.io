import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { RootProvider } from 'fumadocs-ui/provider/next';
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('preroll-theme');if(t&&t!=='midnight')document.documentElement.classList.add('theme-'+t)}catch(e){}})()`,
          }}
        />
        <RootProvider
          theme={{
            defaultTheme: 'dark',
            forcedTheme: 'dark',
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
