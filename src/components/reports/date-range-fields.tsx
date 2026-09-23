"use client";

import { Input } from "@/components/ui/input";
import { MAX_PERIOD_DAYS } from "@/lib/reports/constants";

interface DateRangeFieldsProps {
  dateFrom: string | null;
  dateTo: string | null;
  onChange: (next: { dateFrom: string | null; dateTo: string | null }) => void;
}

function daysBetween(from: string, to: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / msPerDay,
  );
}

export function DateRangeFields({
  dateFrom,
  dateTo,
  onChange,
}: DateRangeFieldsProps) {
  const tooLong =
    !!dateFrom && !!dateTo && daysBetween(dateFrom, dateTo) > MAX_PERIOD_DAYS;
  const wrongOrder = !!dateFrom && !!dateTo && dateFrom > dateTo;

  return (
    <div>
      <div className="flex gap-2">
        <label className="flex-1 text-sm">
          <span className="text-muted-foreground mb-1 block">С даты</span>
          <Input
            onChange={(e) =>
              onChange({ dateFrom: e.target.value || null, dateTo })
            }
            type="date"
            value={dateFrom ?? ""}
          />
        </label>
        <label className="flex-1 text-sm">
          <span className="text-muted-foreground mb-1 block">По дату</span>
          <Input
            onChange={(e) =>
              onChange({ dateFrom, dateTo: e.target.value || null })
            }
            type="date"
            value={dateTo ?? ""}
          />
        </label>
      </div>
      {wrongOrder && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          Дата начала должна быть не позже даты окончания.
        </p>
      )}
      {!wrongOrder && tooLong && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          Период не может быть длиннее {MAX_PERIOD_DAYS} дней.
        </p>
      )}
    </div>
  );
}
