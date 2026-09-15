"use client";

import Image from "next/image";
import { motion, MotionConfig } from "motion/react";

import { ThemeToggle } from "@/components/theme-toggle";

const ease = [0.22, 1, 0.36, 1] as const;

export function SovaShell() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden px-5 py-16 sm:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_42%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_40%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.035] dark:opacity-[0.055]"
        />

        <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
          <ThemeToggle />
        </div>

        <motion.section
          animate={{ opacity: 1, y: 0 }}
          aria-labelledby="sova-title"
          className="bg-card/80 relative w-full max-w-2xl rounded-[2rem] border border-white/60 px-7 py-12 text-center shadow-[0_24px_90px_-36px_color-mix(in_oklab,var(--primary)_45%,transparent)] backdrop-blur-2xl sm:px-14 sm:py-16 dark:border-white/10"
          initial={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.7, ease }}
        >
          <motion.div
            animate={{ rotate: 0, scale: 1 }}
            className="mx-auto mb-8 flex min-h-40 w-full items-center justify-center"
            initial={{ rotate: -6, scale: 0.88 }}
            transition={{ delay: 0.12, duration: 0.8, ease }}
          >
            <Image
              alt="Логотип СОВА"
              className="h-auto w-full max-w-md object-contain drop-shadow-[0_22px_28px_color-mix(in_oklab,var(--primary)_22%,transparent)]"
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
            <h1 className="sr-only" id="sova-title">
              СОВА
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-base leading-7 text-balance sm:text-lg sm:leading-8">
              Система организации взаимодействия с академической средой
            </p>
          </motion.div>

          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="border-border bg-background/60 text-muted-foreground mt-9 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            initial={{ opacity: 0, y: 8 }}
            transition={{ delay: 0.46, duration: 0.55, ease }}
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_color-mix(in_oklab,#10b981_14%,transparent)]"
            />
            Базовая платформа готова к развитию
          </motion.div>
        </motion.section>
      </main>
    </MotionConfig>
  );
}
