import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PreRoll",
  description: "Podcast production management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
