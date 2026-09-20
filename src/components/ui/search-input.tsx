"use client";

import { Search, X } from "lucide-react";
import { type ChangeEvent, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value"
> & {
  clearLabel: string;
  onChange: (value: string) => void;
  value: string;
};

export function SearchInput({
  className,
  clearLabel,
  onChange,
  value,
  ...props
}: SearchInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
      />
      <input
        className="bg-card placeholder:text-muted-foreground h-12 w-full appearance-none rounded-xl border pr-12 pl-11 text-sm shadow-sm transition-[border-color,box-shadow] outline-none focus:border-[var(--atmr-accent-primary)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--atmr-accent-primary)_18%,transparent)] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        onChange={handleChange}
        type="search"
        value={value}
        {...props}
      />
      {value ? (
        <button
          aria-label={clearLabel}
          className="text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2"
          onClick={() => onChange("")}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
