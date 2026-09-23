"use client";

import { motion } from "motion/react";

const particleCount = 126;
const cssPixels = (value: number) => `${value.toFixed(5)}px`;
const cssPercent = (value: number) => `${value.toFixed(5)}%`;

/**
 * Детерминированный псевдослучайный генератор по индексу.
 *
 * `Math.random()` в клиентском компоненте дал бы разные позиции на сервере и
 * при гидратации — React бы ругался на несовпадение разметки. Синус от
 * индекса даёт то же "случайное" распределение, но стабильно повторяется.
 */
function pseudoRandom(seed: number) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

const particles = Array.from({ length: particleCount }, (_, index) => {
  const left = cssPercent(pseudoRandom(index * 12.9898) * 100);
  const top = cssPercent(pseudoRandom(index * 78.233 + 1) * 100);
  const size = cssPixels(2 + pseudoRandom(index * 37.719 + 2) * 3);
  const duration = 10 + pseudoRandom(index * 4.671 + 3) * 10;
  const delay = pseudoRandom(index * 9.123 + 4) * -duration;
  const drift = 14 + pseudoRandom(index * 5.417 + 5) * 18;
  const isOrange = index % 3 === 0;

  return { delay, drift, duration, isOrange, left, size, top };
});

/**
 * Живой фон стартового экрана: два медленно дышащих цветовых пятна плюс
 * плавающие частицы поверх статичной сетки. Не влияет на разметку — только
 * `position: absolute` слои позади контента.
 *
 * Скорость и амплитуда намеренно небольшие: фон должен читаться боковым
 * зрением, а не отвлекать от формы входа. `MotionConfig reducedMotion="user"`
 * в `SovaShell` глушит перемещение для тех, кто просил ОС не анимировать.
 */
export function LandingBackground() {
  return (
    <>
      <motion.div
        animate={{
          scale: [1, 1.12, 0.96, 1],
          x: [0, 30, -16, 0],
          y: [0, -24, 18, 0],
        }}
        aria-hidden="true"
        className="absolute top-[-10%] left-[8%] -z-20 size-[34rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--atmr-accent-primary) 26%, transparent), transparent 70%)",
        }}
        transition={{ duration: 22, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        animate={{
          scale: [1, 0.92, 1.1, 1],
          x: [0, -26, 20, 0],
          y: [0, 20, -16, 0],
        }}
        aria-hidden="true"
        className="absolute right-[6%] bottom-[-14%] -z-20 size-[30rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--atmr-brand-orange) 20%, transparent), transparent 70%)",
        }}
        transition={{
          delay: 2,
          duration: 26,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:40px_40px] opacity-[0.025] dark:opacity-[0.04]"
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden"
      >
        {particles.map((particle, index) => (
          <motion.span
            animate={{
              y: [0, -particle.drift, 0],
              opacity: [0.15, 0.6, 0.15],
            }}
            className={
              particle.isOrange
                ? "absolute rounded-full bg-[var(--atmr-brand-orange)]"
                : "absolute rounded-full bg-[var(--atmr-accent-primary)]"
            }
            key={index}
            style={{
              height: particle.size,
              left: particle.left,
              top: particle.top,
              width: particle.size,
            }}
            transition={{
              delay: particle.delay,
              duration: particle.duration,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        ))}
      </div>
    </>
  );
}
