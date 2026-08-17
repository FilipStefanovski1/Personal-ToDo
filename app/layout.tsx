import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeSync } from "@/components/ThemeSync";
import { AppShell } from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Year — habit tracker",
  description:
    "A daily habit checklist and a year-long, colour-coded record of everything you kept up with.",
  applicationName: "Year",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Year",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#16161a" },
  ],
};

/**
 * Runs before first paint so the correct theme class is on <html> already —
 * without this there's a white flash for dark-mode users on every load.
 */
const themeBootstrap = `
(function () {
  try {
    var raw = localStorage.getItem("habit-year:v1");
    var pref = raw ? (JSON.parse(raw).settings || {}).theme : "system";
    if (pref !== "light" && pref !== "dark") {
      pref = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.classList.toggle("dark", pref === "dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrap}
        </Script>
        <StoreProvider>
          <ThemeSync />
          <AppShell>{children}</AppShell>
        </StoreProvider>
      </body>
    </html>
  );
}
