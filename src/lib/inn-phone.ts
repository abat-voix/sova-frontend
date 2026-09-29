/**
 * Ввод ИНН и телефона: фильтр символов при наборе и проверка перед отправкой. Правила совпадают с
 * `sova/core/validators.py` на бэкенде — ИНН из 10 или 12 цифр, в телефоне от 10 до 15 цифр.
 */

const PHONE_MIN_DIGITS = 10;
const PHONE_MAX_DIGITS = 15;
const PHONE_MAX_LENGTH = 50;

/** Оставляет в ИНН только цифры, не больше 12. */
export function sanitizeInn(value: string) {
  return value.replace(/\D/g, "").slice(0, 12);
}

/** Оставляет в телефоне цифры, пробелы, скобки, дефисы и «+» — только в начале. */
export function sanitizePhone(value: string) {
  const allowed = value.replace(/[^\d\s()+-]/g, "");
  const leadingPlus = allowed.trimStart().startsWith("+") ? "+" : "";
  return (leadingPlus + allowed.replace(/\+/g, "").trimStart()).slice(
    0,
    PHONE_MAX_LENGTH,
  );
}

/** Пустой ИНН допустим; иначе — 10 цифр (юрлицо) или 12 (физлицо, ИП). */
export function isValidInn(value: string | null | undefined) {
  const inn = (value ?? "").trim();
  return inn === "" || /^(\d{10}|\d{12})$/.test(inn);
}

/** Пустой телефон допустим; иначе — только разрешённые символы и от 10 до 15 цифр. */
export function isValidPhone(value: string | null | undefined) {
  const phone = (value ?? "").trim();
  if (phone === "") return true;
  const digits = phone.replace(/\D/g, "").length;
  return (
    /^\+?[\d\s()-]+$/.test(phone) &&
    digits >= PHONE_MIN_DIGITS &&
    digits <= PHONE_MAX_DIGITS
  );
}

export const innPhoneHints = {
  ru: {
    inn: "10 или 12 цифр",
    phone: "Например, +7 (999) 123-45-67",
    invalidInn: "ИНН должен состоять из 10 или 12 цифр",
    invalidPhone: "Телефон: от 10 до 15 цифр",
  },
  en: {
    inn: "10 or 12 digits",
    phone: "For example, +7 (999) 123-45-67",
    invalidInn: "Tax ID must be 10 or 12 digits",
    invalidPhone: "Phone: 10 to 15 digits",
  },
} as const;

/** Подсказка под полем ИНН: формат, а при неверном значении — ошибка. */
export function innHint(value: string, locale: "ru" | "en") {
  const hints = innPhoneHints[locale];
  return isValidInn(value) ? hints.inn : hints.invalidInn;
}

/** Подсказка под полем телефона: пример, а при неверном значении — ошибка. */
export function phoneHint(value: string, locale: "ru" | "en") {
  const hints = innPhoneHints[locale];
  return isValidPhone(value) ? hints.phone : hints.invalidPhone;
}

/** Ошибка под полем ИНН, если значение неверное. */
export function innError(value: string, locale: "ru" | "en") {
  return isValidInn(value) ? undefined : innPhoneHints[locale].invalidInn;
}

/** Ошибка под полем телефона, если значение неверное. */
export function phoneError(value: string, locale: "ru" | "en") {
  return isValidPhone(value) ? undefined : innPhoneHints[locale].invalidPhone;
}
