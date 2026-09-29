"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import styles from "@/components/organizations/organization-sheet.module.css";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrganizationSheetProps = {
  children: ReactNode;
  closeLabel: string;
  labelledBy: string;
  onClose: () => void;
};

/**
 * Bottom sheet used on small screens instead of the desktop side panel. Mount
 * it only where it is meant to be visible: it locks page scrolling and listens
 * for Escape while open.
 */
export function OrganizationSheet({
  children,
  closeLabel,
  labelledBy,
  onClose,
}: OrganizationSheetProps) {
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label={closeLabel}
        className="absolute inset-0 bg-[var(--atmr-overlay)]"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={cn(
          styles.sheet,
          "bg-card relative max-h-[85svh] overflow-y-auto rounded-t-2xl border-t px-5 pt-3 pb-8 shadow-2xl",
        )}
        role="dialog"
      >
        <span
          aria-hidden="true"
          className="bg-border mx-auto mb-4 block h-1 w-10 rounded-full"
        />
        <Button
          aria-label={closeLabel}
          className="absolute top-3 right-3"
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
