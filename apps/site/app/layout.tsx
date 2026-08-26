import type { Metadata, Viewport } from "next";

import "./globals.css";
import { SiteShell } from "../components/SiteShell";

export const metadata: Metadata = {
  title: "SiteOS — Site",
  description: "Offline-first site app for South African commercial building.",
};

export const viewport: Viewport = {
  themeColor: "#f1f1f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
