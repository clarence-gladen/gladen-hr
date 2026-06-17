import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n/language-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gladen HR",
  description: "Gladen Maintenance Services HR Portal",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gladen HR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2b3d6b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground overflow-x-hidden">
        {/*
          Fixed brand-blue strip that covers env(safe-area-inset-top) on every page.
          0px tall on desktop/non-notch devices so it is invisible there.
          pointer-events:none so it never blocks taps in the header area.
        */}
        <div
          className="fixed inset-x-0 top-0 z-50 bg-brand pointer-events-none"
          style={{ height: "env(safe-area-inset-top)" }}
          aria-hidden="true"
        />
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
