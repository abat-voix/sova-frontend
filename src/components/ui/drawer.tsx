"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import styles from "@/components/ui/drawer.module.css";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DrawerProps = {
  children: ReactNode;
  className?: string;
  closeLabel: string;
  /** Нижняя панель: действия над записью. */
  footer?: ReactNode;
  /** `id` заголовка внутри панели — её название для скринридера. */
  labelledBy: string;
  onClose: () => void;
};

/**
 * Боковая панель просмотра записи. На узком экране выезжает снизу, с ширины
 * планшета — справа.
 *
 * Монтируйте только когда панель должна быть видна: она блокирует прокрутку
 * страницы и слушает Escape, пока открыта.
 */
export function Drawer({
  children,
  className,
  closeLabel,
  footer,
  labelledBy,
  onClose,
}: DrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:flex-row sm:justify-end">
      <button
        aria-label={closeLabel}
        className="absolute inset-0 bg-[var(--atmr-overlay)]"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={cn(
          styles.drawer,
          "bg-card relative flex max-h-[85svh] w-full flex-col overflow-hidden rounded-t-2xl border-t shadow-2xl sm:h-full sm:max-h-none sm:w-[26.25rem] sm:rounded-none sm:rounded-l-2xl sm:border-t-0 sm:border-l",
          className,
        )}
        role="dialog"
      >
        <Button
          aria-label={closeLabel}
          className="absolute top-3 right-3 z-10"
          colorScheme="neutral"
          onClick={onClose}
          ref={closeButtonRef}
          size="icon"
          title={closeLabel}
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-5" />
        </Button>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6">
          {children}
        </div>

        {footer ? <div className="border-t px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
