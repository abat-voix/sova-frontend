"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();

  return (
    <Button
      aria-label={t("switchTheme")}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      size="icon"
      title={t("switchTheme")}
      type="button"
      variant="outline"
      colorScheme="neutral"
    >
      <Sun aria-hidden="true" className="size-[1.125rem] dark:hidden" />
      <Moon aria-hidden="true" className="hidden size-[1.125rem] dark:block" />
    </Button>
  );
}
