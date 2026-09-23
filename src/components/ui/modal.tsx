"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ModalProps = {
  /** Разрешает дочерним popover-элементам выходить за границы модалки. */
  allowContentOverflow?: boolean;
  children: ReactNode;
  closeLabel: string;
  labelledBy: string;
  onClose: () => void;
};

/**
 * Центрированное модальное окно. Монтируйте только когда оно должно быть
 * видно: окно блокирует прокрутку страницы и слушает Escape.
 *
 * Вложенные выпадушки гасят Escape у себя, поэтому первый Escape закрывает
 * открытый список, а не всё окно.
 */
export function Modal({
  allowContentOverflow = false,
  children,
  closeLabel,
  labelledBy,
  onClose,
}: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
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
          "bg-card relative flex max-h-[90svh] w-full max-w-2xl flex-col rounded-t-2xl border shadow-2xl sm:rounded-2xl",
          allowContentOverflow ? "overflow-visible" : "overflow-hidden",
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
        {children}
      </div>
    </div>
  );
}
