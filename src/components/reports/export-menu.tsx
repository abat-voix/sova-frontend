"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FORMAT_OPTIONS, PDF_ROW_LIMIT } from "@/lib/reports/constants";
import { describeApiError } from "@/lib/reports/errors";
import type { ReportFilters, ReportFormat } from "@/lib/reports/types";
import { cn } from "@/lib/utils";

interface ExportMenuProps {
  filters: ReportFilters;
  rowCount: number | undefined;
  onExport: (filters: ReportFilters, format: ReportFormat) => Promise<unknown>;
}

export function ExportMenu({ filters, rowCount, onExport }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<ReportFormat | null>(null);
  const pdfDisabled = rowCount != null && rowCount > PDF_ROW_LIMIT;

  async function handleExport(format: ReportFormat) {
    setOpen(false);
    setPending(format);
    try {
      await onExport(filters, format);
      toast.success("Выгрузка добавлена в панель загрузок");
    } catch (error) {
      toast.error(describeApiError(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="relative">
      <Button
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Download aria-hidden="true" className="size-4" />
        Скачать
      </Button>

      {open && (
        <div className="border-border bg-card absolute right-0 z-20 mt-2 w-48 rounded-md border p-1 shadow-lg backdrop-blur-xl">
          {FORMAT_OPTIONS.map((option) => {
            const disabled =
              (option.value === "pdf" && pdfDisabled) || pending !== null;
            return (
              <button
                className={cn(
                  "hover:bg-secondary flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50",
                )}
                disabled={disabled}
                key={option.value}
                onClick={() => handleExport(option.value)}
                title={
                  option.value === "pdf" && pdfDisabled
                    ? `Слишком много строк для PDF (лимит ${PDF_ROW_LIMIT})`
                    : undefined
                }
                type="button"
              >
                {option.label}
                {pending === option.value && (
                  <span className="text-muted-foreground text-xs">…</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
