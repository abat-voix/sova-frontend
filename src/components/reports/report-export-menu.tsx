"use client";

import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { resolveReportRequestError } from "@/lib/reports/report-errors";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/locale-provider";
import type { ReportFilters, ReportFormat } from "@/types/report";

const pdfRowLimit = 5000;

const formatLabels: Record<ReportFormat, string> = {
  json: "JSON",
  pdf: "PDF",
  xls: "XLS",
  xlsx: "XLSX",
};

const copy = {
  ru: {
    download: "Скачать",
    exportAdded: "Выгрузка добавлена в панель загрузок",
    pdfDisabledHint: `Слишком много строк для PDF (лимит ${pdfRowLimit})`,
  },
  en: {
    download: "Download",
    exportAdded: "The export was added to the downloads panel",
    pdfDisabledHint: `Too many rows for PDF (limit ${pdfRowLimit})`,
  },
} as const;

type ReportExportMenuProps = {
  filters: ReportFilters;
  onExport: (filters: ReportFilters, format: ReportFormat) => Promise<unknown>;
  rowCount: number | undefined;
};

export function ReportExportMenu({
  filters,
  onExport,
  rowCount,
}: ReportExportMenuProps) {
  const { locale } = useLocale();
  const text = copy[locale];
  const [isOpen, setIsOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<ReportFormat | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDisabled = rowCount != null && rowCount > pdfRowLimit;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  async function handleExport(format: ReportFormat) {
    setIsOpen(false);
    setPendingFormat(format);
    try {
      await onExport(filters, format);
      toast.success(text.exportAdded);
    } catch (error) {
      toast.error(resolveReportRequestError(error, locale));
    } finally {
      setPendingFormat(null);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        size="m"
        type="button"
      >
        <Download aria-hidden="true" className="size-4" />
        {text.download}
      </Button>

      {isOpen ? (
        <div className="bg-card absolute right-0 z-20 mt-1 w-48 rounded-xl border p-1 shadow-lg">
          {(Object.keys(formatLabels) as ReportFormat[]).map((format) => {
            const disabled =
              (format === "pdf" && pdfDisabled) || pendingFormat !== null;

            return (
              <button
                className={cn(
                  "hover:bg-secondary flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40",
                )}
                disabled={disabled}
                key={format}
                onClick={() => handleExport(format)}
                title={
                  format === "pdf" && pdfDisabled
                    ? text.pdfDisabledHint
                    : undefined
                }
                type="button"
              >
                {formatLabels[format]}
                {pendingFormat === format ? (
                  <span className="text-muted-foreground text-xs">…</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
