# СОВА — frontend

Система организации взаимодействия с академической средой для ИТ Школы
Ростелекома.

На текущем этапе репозиторий содержит только инфраструктуру и брендированную
оболочку. Бизнес-модули, Keycloak и API-контракты намеренно не реализованы.

Визуальный слой следует дизайн-системе Ростелекома второго поколения: тема
использует совместимые классы `Theme_root_rtk_default_light` и
`Theme_root_rtk_default_dark`, а локальные UI-компоненты повторяют публичные
варианты и размеры Atomaro. Актуальные пакеты `@atomaro/themes` и
`@atomaro/ui-kit` публикуются во внутреннем registry, поэтому их можно будет
подключить поверх этого контракта после настройки доступа.

Основная гарнитура интерфейса — фирменный шрифт Rostelecom Basis в начертаниях
Regular, Medium и Bold. Файлы шрифта хранятся локально и подключаются через
`next/font`.

## Требования

- Node.js 24.19.0 (минимально поддерживается 20.9.0)
- pnpm 11.19.0

Версия Node.js зафиксирована в `.nvmrc`, версия pnpm — в `package.json`.

## Локальный запуск

```bash
nvm install
nvm use
corepack enable
cp .env.example .env.local
pnpm install
pnpm dev
```

Приложение откроется на [http://localhost:3000](http://localhost:3000).

`API_PROXY_TARGET` задаёт адрес локального Django (по умолчанию
`http://localhost:8000`). Браузер всегда обращается к относительному `/api`, а
Next.js проксирует запросы в development. На стенде тот же путь направляет в
Django Caddy.

## Авторизация

Вход выполняется через Keycloak, но frontend не получает OIDC-токены. Он читает
состояние Django-сессии из `GET /api/auth/me/`, переводит пользователя на
server-side OIDC login и отправляет logout как CSRF-защищённый POST. После входа
в правом верхнем углу отображается имя пользователя и кнопка выхода.

Для локального полного потока Keycloak client должен разрешать callback
`http://localhost:3000/api/auth/oidc/callback/`. Готовая конфигурация realm
находится в infra-репозитории.

## Проверки

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Команда `pnpm check` запускает все проверки, кроме Playwright. Перед коммитом
Husky форматирует staged-файлы, проверяет типы и запускает unit-тесты.

Для первого запуска e2e-тестов установите Chromium:

```bash
pnpm exec playwright install chromium
```

## Docker

```bash
docker build -t sova-frontend .
docker run --rm -p 3000:3000 sova-frontend
```

Production-образ использует standalone-сборку Next.js и непривилегированного
пользователя.

## Архитектурная граница

Next.js является отдельным frontend-приложением. Доменная логика, отчёты,
файлы и интеграции принадлежат самостоятельному backend API. Будущий
OpenAPI-клиент будет размещён в `src/lib/api` после согласования контракта.

Все browser API-вызовы должны использовать относительный `/api`, чтобы session
и CSRF cookies оставались same-origin.
