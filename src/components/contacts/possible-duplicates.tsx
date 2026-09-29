"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getPossibleDuplicates,
  type PossibleDuplicatesQuery,
} from "@/lib/api/catalog/contact-persons";
import type { Locale } from "@/i18n/translations";
import type { ContactPerson } from "@/types/contact-person";

const debounceMs = 400;
/** Короче трёх букв ФИО совпадает у слишком многих — подсказка бесполезна. */
const minNameLength = 3;

const copy = {
  ru: {
    hint: "Возможно, этот человек уже есть:",
    pick: "Это он",
    noOrganizations: "без организаций",
  },
  en: {
    hint: "This person may already exist:",
    pick: "That's them",
    noOrganizations: "no organizations",
  },
} as const;

/** Люди, похожие на вводимого, — с задержкой, чтобы не спрашивать на каждую букву. */
export function usePossibleDuplicates(
  signs: PossibleDuplicatesQuery,
  enabled = true,
) {
  const [debounced, setDebounced] = useState(signs);
  const key = JSON.stringify(signs);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => setDebounced(JSON.parse(key)),
      debounceMs,
    );

    return () => window.clearTimeout(timeoutId);
  }, [key]);

  const hasSigns =
    (debounced.fullName?.trim().length ?? 0) >= minNameLength ||
    Boolean(debounced.email?.trim()) ||
    Boolean(debounced.phone?.trim()) ||
    Boolean(debounced.telegram?.trim());

  return useQuery({
    queryKey: ["catalog", "contact-persons", "possible-duplicates", debounced],
    queryFn: () => getPossibleDuplicates(debounced),
    enabled: enabled && hasSigns,
  });
}

/** «Похоже на Иванова И.И. (МГУ, проректор) — это он?» */
export function PossibleDuplicates({
  contacts,
  locale,
  onPick,
}: {
  contacts: ContactPerson[];
  locale: Locale;
  onPick?: (contact: ContactPerson) => void;
}) {
  const text = copy[locale];

  if (contacts.length === 0) return null;

  return (
    <section
      aria-label={text.hint}
      className="bg-secondary/70 space-y-2 rounded-lg p-3"
    >
      <p className="text-sm font-medium">{text.hint}</p>
      <ul className="space-y-2">
        {contacts.map((contact) => (
          <li
            className="flex items-start justify-between gap-3"
            key={contact.id}
          >
            <div className="min-w-0 text-sm">
              <p className="font-medium break-words">{contact.full_name}</p>
              <p className="text-muted-foreground text-xs break-words">
                {contact.affiliations.length > 0
                  ? contact.affiliations
                      .map((affiliation) =>
                        affiliation.position
                          ? `${affiliation.organization.name}, ${affiliation.position}`
                          : affiliation.organization.name,
                      )
                      .join("; ")
                  : text.noOrganizations}
                {contact.email ? ` · ${contact.email}` : ""}
              </p>
            </div>
            {onPick ? (
              <Button
                colorScheme="neutral"
                onClick={() => onPick(contact)}
                size="s"
                type="button"
                variant="outline"
              >
                {text.pick}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
