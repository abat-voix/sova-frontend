export const translations = {
  ru: {
    authChecking: "Проверяем вход…",
    logIn: "Войти",
    logOut: "Выйти",
    logoAlt: "Логотип СОВА",
    productName: "СОВА",
    productDescription:
      "Система организации взаимодействия с академической средой",
    platformStatus: "Базовая платформа готова к развитию",
    switchLanguage: "Переключить язык на английский",
    switchTheme: "Переключить тему",
  },
  en: {
    authChecking: "Checking sign-in…",
    logIn: "Sign in",
    logOut: "Sign out",
    logoAlt: "SOVA logo",
    productName: "SOVA",
    productDescription:
      "System for organizing collaboration with the academic community",
    platformStatus: "The core platform is ready for development",
    switchLanguage: "Switch language to Russian",
    switchTheme: "Switch theme",
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof (typeof translations)["ru"];

export const defaultLocale: Locale = "ru";
export const localeStorageKey = "sova-locale";

export function isLocale(value: string | null): value is Locale {
  return value === "ru" || value === "en";
}
