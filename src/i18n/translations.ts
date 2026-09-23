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
    buildVersion: "Версия сборки",
    crmWorkspace: "Личная Единая Среда (ЛЕС)",
    mainNavigation: "Основная навигация",
    navWork: "Мой ЛЕС",
    navDocuments: "Документы",
    navClients: "Клиенты",
    navCatalog: "Каталог",
    navAdministration: "Администрирование",
    home: "Главная",
    homeDescription:
      "Управляйте взаимодействием с организациями и следите за ходом договорных процессов в едином пространстве.",
    myTasks: "Мои задачи",
    myTasksDescription: "Действия процессов, назначенные вам, и их сроки.",
    contracts: "Договоры",
    contractsDescription: "Договоры и связанные с ними процессы.",
    licenses: "Лицензии",
    licensesDescription: "Реестр лицензий, подписание и сроки действия.",
    reports: "Отчёты",
    reportsDescription:
      "Отчёты по взаимодействиям с вузами: предпросмотр, сводка и выгрузка.",
    interactions: "Взаимодействия",
    interactionsDescription:
      "Взаимодействия с вузами и выполнение связанных workflow.",
    organizations: "Организации",
    organizationsDescription: "Университеты и партнёрские организации.",
    contacts: "Контакты",
    contactsDescription: "Контактные лица и история взаимодействия.",
    itCatalog: "ИТ-каталог",
    itCatalogDescription: "ИТ-направления, программы и продукты.",
    vendors: "Вендоры",
    vendorsDescription: "Поставщики ИТ-продуктов каталога.",
    workflowTemplates: "Шаблоны процессов",
    workflowTemplatesDescription:
      "Настройка этапов, действий и переходов процесса.",
    welcome: "Добро пожаловать",
    sectionReady: "Каркас раздела готов",
    sectionReadyDescription:
      "Содержимое появится после проектирования сценариев и подключения API.",
    openNavigation: "Открыть навигацию",
    closeNavigation: "Закрыть навигацию",
    collapseSidebar: "Свернуть боковую панель",
    expandSidebar: "Развернуть боковую панель",
    messengerTitle: "Сообщения",
    openMessenger: "Открыть сообщения",
    closeMessenger: "Закрыть сообщения",
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
    buildVersion: "Build version",
    crmWorkspace: "CRM workspace",
    mainNavigation: "Main navigation",
    navWork: "Work",
    navDocuments: "Documents",
    navClients: "Clients",
    navCatalog: "Catalog",
    navAdministration: "Administration",
    home: "Home",
    homeDescription:
      "Manage relationships with organizations and follow contract processes in one workspace.",
    myTasks: "My tasks",
    myTasksDescription: "Process actions assigned to you and their deadlines.",
    contracts: "Contracts",
    contractsDescription: "Contracts and their related processes.",
    licenses: "Licenses",
    licensesDescription: "License register, signing, and validity periods.",
    reports: "Reports",
    reportsDescription:
      "University interaction reports: preview, summary, and export.",
    interactions: "Interactions",
    interactionsDescription:
      "University interactions and their related workflows.",
    organizations: "Organizations",
    organizationsDescription: "Universities and partner organizations.",
    contacts: "Contacts",
    contactsDescription: "Contact people and interaction history.",
    itCatalog: "IT catalog",
    itCatalogDescription: "IT directions, programs, and products.",
    vendors: "Vendors",
    vendorsDescription: "Suppliers of the catalog's IT products.",
    workflowTemplates: "Process templates",
    workflowTemplatesDescription:
      "Configure process stages, actions, and transitions.",
    welcome: "Welcome",
    sectionReady: "The section scaffold is ready",
    sectionReadyDescription:
      "Content will appear after its workflows are designed and the API is connected.",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",
    messengerTitle: "Messages",
    openMessenger: "Open messages",
    closeMessenger: "Close messages",
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof (typeof translations)["ru"];

export const defaultLocale: Locale = "ru";
export const localeStorageKey = "sova-locale";

export function isLocale(value: string | null): value is Locale {
  return value === "ru" || value === "en";
}
