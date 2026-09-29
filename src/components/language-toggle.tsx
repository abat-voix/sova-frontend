"use client";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();
  const nextLocale = locale === "ru" ? "en" : "ru";

  return (
    <Button
      aria-label={t("switchLanguage")}
      colorScheme="neutral"
      onClick={() => setLocale(nextLocale)}
      size="m"
      title={t("switchLanguage")}
      type="button"
      variant="outline"
    >
      <Languages aria-hidden="true" className="size-4" />
      {nextLocale.toUpperCase()}
    </Button>
  );
}
