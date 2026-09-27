"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * Действие в два шага: первая кнопка только объясняет последствия и
 * спрашивает подтверждение — удаление связи или выключение человека
 * отвязывает его от взаимодействий и уведомляет КАМов.
 */
export function ConfirmAction({
  cancelLabel,
  confirmLabel,
  icon,
  isPending,
  label,
  onConfirm,
  pendingLabel,
  question,
}: {
  cancelLabel: string;
  confirmLabel: string;
  icon?: ReactNode;
  isPending: boolean;
  label: string;
  onConfirm: () => void;
  pendingLabel: string;
  question: string;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isConfirming) {
    return (
      <Button
        colorScheme="neutral"
        onClick={() => setIsConfirming(true)}
        size="s"
        type="button"
        variant="ghost"
      >
        {icon}
        {label}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm">{question}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={isPending} onClick={onConfirm} size="s" type="button">
          {isPending ? pendingLabel : confirmLabel}
        </Button>
        <Button
          colorScheme="neutral"
          disabled={isPending}
          onClick={() => setIsConfirming(false)}
          size="s"
          type="button"
          variant="outline"
        >
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
