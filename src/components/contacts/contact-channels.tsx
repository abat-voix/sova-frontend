"use client";

import type { Locale } from "@/i18n/translations";
import {
  contactChannels,
  type ContactChannel,
  type ContactPersonPayload,
} from "@/types/contact-person";

export const contactChannelLabels: Record<
  Locale,
  Record<ContactChannel, string>
> = {
  ru: {
    email: "Почта",
    phone: "Телефон",
    telegram: "Чат в Telegram",
  },
  en: {
    email: "Email",
    phone: "Phone",
    telegram: "Telegram chat",
  },
};

const missingChannelHints: Record<Locale, Record<ContactChannel, string>> = {
  ru: {
    email: "почту",
    phone: "телефон",
    telegram: "Telegram",
  },
  en: {
    email: "an email",
    phone: "a phone",
    telegram: "a Telegram handle",
  },
};

const missingPrefix: Record<Locale, string> = {
  ru: "Чтобы выбрать способ связи, укажите у контакта",
  en: "To choose a channel, add the contact's",
};

/** Поля человека, от которых зависят способы связи. */
export type ChannelSource = Pick<
  ContactPersonPayload,
  "email" | "phone" | "telegram"
>;

/** Способы связи, для которых у человека заполнено поле: «Телефон» — только с телефоном и т. д. */
export function availableChannels(person: ChannelSource): ContactChannel[] {
  return contactChannels.filter((channel) => person[channel].trim() !== "");
}

/**
 * «Способ связи» у связи с организацией: как человек предпочитает общаться.
 * Канал без данных у человека (`available`) выбрать нельзя, отмеченный — не показывается отмеченным.
 */
export function ChannelCheckboxes({
  available = contactChannels,
  idPrefix,
  label,
  locale,
  onChange,
  value,
}: {
  available?: readonly ContactChannel[];
  idPrefix: string;
  label: string;
  locale: Locale;
  onChange: (value: ContactChannel[]) => void;
  value: ContactChannel[];
}) {
  const selected = value.filter((channel) => available.includes(channel));
  const missing = contactChannels.filter(
    (channel) => !available.includes(channel),
  );

  return (
    <fieldset>
      <legend className="text-muted-foreground text-xs">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-4">
        {contactChannels.map((channel) => (
          <label
            className="flex items-center gap-2 text-sm has-disabled:opacity-50"
            htmlFor={`${idPrefix}-${channel}`}
            key={channel}
          >
            <input
              checked={selected.includes(channel)}
              disabled={!available.includes(channel)}
              id={`${idPrefix}-${channel}`}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? contactChannels.filter(
                        (item) => item === channel || selected.includes(item),
                      )
                    : selected.filter((item) => item !== channel),
                )
              }
              type="checkbox"
            />
            {contactChannelLabels[locale][channel]}
          </label>
        ))}
      </div>
      {missing.length > 0 ? (
        <p className="text-muted-foreground mt-1 text-xs">
          {`${missingPrefix[locale]} ${missing
            .map((channel) => missingChannelHints[locale][channel])
            .join(", ")}`}
        </p>
      ) : null}
    </fieldset>
  );
}
