import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "border border-transparent",
        secondary: "border border-transparent",
        outline: "border bg-transparent",
        ghost: "border border-transparent bg-transparent",
      },
      colorScheme: {
        accent: "",
        neutral: "",
      },
      size: {
        xl: "h-14 min-w-[5.625rem] px-6 text-base",
        l: "h-12 min-w-[4.75rem] px-5 text-base",
        m: "h-9 min-w-14 px-4 text-sm",
        s: "h-6 min-w-10 gap-1 px-2.5 text-xs",
        icon: "size-9 min-w-9 p-0 text-sm",
      },
    },
    compoundVariants: [
      {
        colorScheme: "accent",
        variant: "primary",
        className:
          "bg-[var(--atmr-accent-primary)] text-[var(--atmr-text-on-accent)] hover:bg-[var(--atmr-accent-hover)] active:bg-[var(--atmr-accent-active)]",
      },
      {
        colorScheme: "accent",
        variant: "secondary",
        className:
          "bg-[var(--atmr-background-accent-soft)] text-[var(--atmr-accent-primary)] hover:brightness-95 dark:hover:brightness-110",
      },
      {
        colorScheme: "accent",
        variant: "outline",
        className:
          "border-[var(--atmr-accent-primary)] text-[var(--atmr-accent-primary)] hover:bg-[var(--atmr-background-accent-soft)]",
      },
      {
        colorScheme: "accent",
        variant: "ghost",
        className:
          "text-[var(--atmr-accent-primary)] hover:bg-[var(--atmr-background-accent-soft)]",
      },
      {
        colorScheme: "neutral",
        variant: "primary",
        className:
          "bg-foreground text-background hover:opacity-88 active:opacity-76",
      },
      {
        colorScheme: "neutral",
        variant: "secondary",
        className:
          "bg-secondary text-foreground hover:brightness-95 dark:hover:brightness-125",
      },
      {
        colorScheme: "neutral",
        variant: "outline",
        className: "border-border text-foreground hover:bg-secondary",
      },
      {
        colorScheme: "neutral",
        variant: "ghost",
        className: "text-foreground hover:bg-secondary",
      },
    ],
    defaultVariants: {
      colorScheme: "accent",
      variant: "primary",
      size: "l",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  asChild = false,
  className,
  colorScheme,
  size,
  variant,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ colorScheme, variant, size, className }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
