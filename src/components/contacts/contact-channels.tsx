"use client";

import type { Locale } from "@/i18n/translations";
import { contactChannels, type ContactChannel } from "@/types/contact-person";

export const contactChannelLabels: Record<
  Locale,
  Record<ContactChannel, string>
> = {
  ru: {
    email: "Почта",
    other: "Другое",
    phone: "Телефон",
    telegram: "Чат в Telegram",
  },
  en: {
    email: "Email",
    other: "Other",
    phone: "Phone",
    telegram: "Telegram chat",
  },
};

/** «Способ связи» у связи с организацией: как человек предпочитает общаться. */
export function ChannelCheckboxes({
  idPrefix,
  label,
  locale,
  onChange,
  value,
}: {
  idPrefix: string;
  label: string;
  locale: Locale;
  onChange: (value: ContactChannel[]) => void;
  value: ContactChannel[];
}) {
  return (
    <fieldset>
      <legend className="text-muted-foreground text-xs">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-4">
        {contactChannels.map((channel) => (
          <label
            className="flex items-center gap-2 text-sm"
            htmlFor={`${idPrefix}-${channel}`}
            key={channel}
          >
            <input
              checked={value.includes(channel)}
              id={`${idPrefix}-${channel}`}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? contactChannels.filter(
                        (item) => item === channel || value.includes(item),
                      )
                    : value.filter((item) => item !== channel),
                )
              }
              type="checkbox"
            />
            {contactChannelLabels[locale][channel]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
