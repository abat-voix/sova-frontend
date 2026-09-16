import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-6 items-center gap-2 rounded-md px-2.5 py-1 text-xs font-medium tracking-[0.01em]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--atmr-accent-primary)] text-[var(--atmr-text-on-accent)]",
        secondary:
          "bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)]",
        neutral: "bg-secondary text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
