import type { ReactNode } from "react";

export type OrganizationInspectorRow = [label: string, value: ReactNode];

/**
 * Общий вид инспектора организации (вуз, B2C-клиент): иконка, название,
 * чипы и поля «подпись — значение». Пустое поле показывается как
 * `noValueLabel`, чтобы у всех карточек был одинаковый набор строк.
 */
export function OrganizationInspector({
  chips,
  headingId,
  icon,
  noValueLabel,
  rows,
  title,
}: {
  chips: ReactNode;
  headingId: string;
  icon: ReactNode;
  noValueLabel: string;
  rows: OrganizationInspectorRow[];
  title: string;
}) {
  return (
    <>
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-medium" id={headingId}>
            {title}
          </h2>
          <span className="mt-2 flex flex-wrap gap-2">{chips}</span>
        </div>
      </div>
      <dl className="mt-5 divide-y">
        {rows.map(([label, value]) => (
          <div className="py-3" key={label}>
            <dt className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
              {label}
            </dt>
            <dd className="mt-1 text-sm break-words">
              {value || (
                <span className="text-muted-foreground">{noValueLabel}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
