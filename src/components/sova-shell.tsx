"use client";

import Image from "next/image";
import { LogIn } from "lucide-react";
import { motion, MotionConfig } from "motion/react";

import { CrmShell } from "@/components/crm/crm-shell";
import type { CrmSection } from "@/components/crm/crm-navigation";
import { LandingBackground } from "@/components/landing-background";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

const ease = [0.22, 1, 0.36, 1] as const;

export function SovaShell({ section = "home" }: { section?: CrmSection }) {
  const auth = useAuth();
  const { t } = useLocale();

  if (auth.user) {
    return (
      <CrmShell
        activeSection={section}
        csrfToken={auth.csrfToken}
        logoutUrl={auth.logoutUrl}
        user={auth.user}
      />
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="bg-background relative isolate flex min-h-svh items-center justify-center overflow-hidden px-5 py-20 sm:px-8">
        <LandingBackground />

        <div className="absolute top-5 right-5 z-10 flex items-center gap-2 sm:top-8 sm:right-8">
          {auth.isLoading ? (
            <Button disabled size="m" variant="outline">
              {t("authChecking")}
            </Button>
          ) : (
            <Button asChild size="m">
              <a href={auth.loginUrl}>
                <LogIn aria-hidden="true" className="size-4" />
                {t("logIn")}
              </a>
            </Button>
          )}
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <motion.section
          animate={{ opacity: 1, y: 0 }}
          aria-labelledby="sova-title"
          className="bg-card relative w-full max-w-3xl overflow-hidden rounded-xl border border-[var(--atmr-border-subtle)] px-7 py-12 text-center shadow-[var(--atmr-shadow-elevated)] sm:px-14 sm:py-16"
          initial={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.7, ease }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--atmr-accent-primary),var(--atmr-brand-orange))]"
          />

          <motion.div
            animate={{ rotate: 0, scale: 1 }}
            className="mx-auto flex min-h-40 w-full items-center justify-center"
            initial={{ rotate: -6, scale: 0.88 }}
            transition={{ delay: 0.12, duration: 0.8, ease }}
          >
            <Image
              alt={t("logoAlt")}
              className="h-auto w-full max-w-md object-contain drop-shadow-[0_18px_30px_color-mix(in_oklab,var(--atmr-accent-primary)_20%,transparent)]"
              height={887}
              priority
              src="/sova-ai.png"
              width={1774}
            />
          </motion.div>

          <motion.div
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={{ delay: 0.28, duration: 0.6 }}
          >
            <h1
              className="mt-4 text-4xl font-medium tracking-[-0.02em] sm:text-5xl"
              id="sova-title"
            >
              {t("productName")}
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-base leading-7 text-balance sm:text-lg sm:leading-8">
              {t("productDescription")}
            </p>
          </motion.div>
        </motion.section>
      </main>
    </MotionConfig>
  );
}
