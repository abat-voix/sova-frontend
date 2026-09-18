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
    crmWorkspace: "Рабочее пространство CRM",
    mainNavigation: "Основная навигация",
    navWork: "Работа",
    navDirectory: "Справочники",
    navAdministration: "Администрирование",
    home: "Главная",
    homeDescription:
      "Управляйте взаимодействием с организациями и следите за ходом договорных процессов в едином пространстве.",
    contracts: "Договоры",
    contractsDescription: "Договоры и связанные с ними процессы.",
    processes: "Процессы",
    processesDescription: "Ход работ, этапы и контроль сроков.",
    organizations: "Организации",
    organizationsDescription: "Университеты и партнёрские организации.",
    contacts: "Контакты",
    contactsDescription: "Контактные лица и история взаимодействия.",
    workflowTemplates: "Шаблоны процессов",
    workflowTemplatesDescription:
      "Настройка этапов, действий и переходов процесса.",
    welcome: "Добро пожаловать",
    workspaceSections: "Разделы рабочего пространства",
    activityPlaceholder: "Здесь появятся активные процессы",
    activityPlaceholderDescription:
      "Когда система получит рабочие данные, на главной будут видны задачи, требующие внимания, и ближайшие сроки.",
    sectionReady: "Каркас раздела готов",
    sectionReadyDescription:
      "Содержимое появится после проектирования сценариев и подключения API.",
    openNavigation: "Открыть навигацию",
    closeNavigation: "Закрыть навигацию",
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
    crmWorkspace: "CRM workspace",
    mainNavigation: "Main navigation",
    navWork: "Work",
    navDirectory: "Directories",
    navAdministration: "Administration",
    home: "Home",
    homeDescription:
      "Manage relationships with organizations and follow contract processes in one workspace.",
    contracts: "Contracts",
    contractsDescription: "Contracts and their related processes.",
    processes: "Processes",
    processesDescription: "Work progress, stages, and deadline control.",
    organizations: "Organizations",
    organizationsDescription: "Universities and partner organizations.",
    contacts: "Contacts",
    contactsDescription: "Contact people and interaction history.",
    workflowTemplates: "Process templates",
    workflowTemplatesDescription:
      "Configure process stages, actions, and transitions.",
    welcome: "Welcome",
    workspaceSections: "Workspace sections",
    activityPlaceholder: "Active processes will appear here",
    activityPlaceholderDescription:
      "Once operational data is available, the home page will surface items that need attention and upcoming deadlines.",
    sectionReady: "The section scaffold is ready",
    sectionReadyDescription:
      "Content will appear after its workflows are designed and the API is connected.",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof (typeof translations)["ru"];

export const defaultLocale: Locale = "ru";
export const localeStorageKey = "sova-locale";

export function isLocale(value: string | null): value is Locale {
  return value === "ru" || value === "en";
}
