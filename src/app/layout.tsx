import type { Metadata } from "next";
import localFont from "next/font/local";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

const rostelecomBasis = localFont({
  src: [
    {
      path: "./fonts/RostelecomBasis-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/RostelecomBasis-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/RostelecomBasis-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-rostelecom-basis",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "СОВА",
  description: "Система организации взаимодействия с академической средой",
  icons: {
    icon: "/sova.png",
    shortcut: "/sova.png",
    apple: "/sova.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={rostelecomBasis.variable}
      lang="ru"
      suppressHydrationWarning
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
