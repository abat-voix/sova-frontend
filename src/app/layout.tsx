import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";

import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "СОВА",
  description: "Система организации взаимодействия с академической средой",
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
