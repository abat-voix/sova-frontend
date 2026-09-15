import type { Metadata } from "next";
import "@fontsource-variable/onest";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

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
    <html lang="ru" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
