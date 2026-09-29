# СОВА — frontend

Frontend Системы организации взаимодействия с академической средой для ИТ Школы
Ростелекома. Приложение написано на Next.js и работает с отдельным Django API
из репозитория `sova-backend`. Docker Compose, Keycloak и маршрутизация Caddy
находятся в репозитории `sova-infra`.

## Что есть в приложении

- CRM-разделы для взаимодействий и процессов, задач, договоров и лицензий,
  организаций, B2C-клиентов и контактов.
- Отчёты с предпросмотром и фоновым экспортом, уведомления и переписка с
  обновлениями через WebSocket.
- Каталоги ИТ-продуктов и вендоров; настройки команд, ролей пользователей,
  шаблонов процессов, интеграций и импорта каталога. Доступ к разделам зависит
  от прав, полученных от backend.
- Русский и английский интерфейс. Язык сохраняется в `localStorage`, переводы
  находятся в `src/i18n/translations.ts`.

Тема использует классы `Theme_root_rtk_default_light` и
`Theme_root_rtk_default_dark`. Компоненты интерфейса находятся в
`src/components/ui`; шрифт Rostelecom Basis хранится локально в
`src/app/fonts` и подключается через `next/font/local`.

## Требования и локальный запуск

- Node.js 24.19.0 из `.nvmrc` (`package.json` допускает версии от 20.9.0 до 24);
- pnpm 11.19.0 из `package.json` через Corepack;
- запущенные Django и инфраструктура для входа и работы с данными.

Порядок запуска всех трёх репозиториев описан в
[инструкции sova-infra](https://github.com/abat-voix/sova-infra/blob/develop/LOCAL_SETUP.md).
После запуска backend и Keycloak выполните:

```bash
nvm install
nvm use
corepack enable
cp .env.example .env.local
pnpm install
pnpm dev
```

Приложение откроется на [http://localhost:3000](http://localhost:3000).
`API_PROXY_TARGET` в `.env.local` должен указывать на локальный Django (по
умолчанию `http://localhost:8000`). Браузер отправляет запросы на относительный
`/api`, а Next.js перенаправляет их в backend. На dev и production тот же путь
маршрутизирует Caddy.

Для локального WebSocket запустите Daphne backend на порту 8001 и оставьте в
`.env.local` значение `NEXT_PUBLIC_WS_URL=ws://localhost:8001/ws/events/`.
Если переменная пуста, клиент использует `/ws/events/` на текущем домене.
При разрыве WebSocket клиент возвращается к опросу API и после восстановления
соединения сверяет данные с сервером.

Карта организаций по умолчанию загружает тайлы с `tile.openstreetmap.org`.
Для другого источника в локальной сборке можно задать
`NEXT_PUBLIC_MAP_TILE_URL` с шаблоном `{z}/{x}/{y}` в `.env.local`.

## Авторизация и API

Вход проходит через Keycloak и Django: frontend читает состояние сессии из
`GET /api/auth/me/`, переводит браузер на серверный OIDC-вход и отправляет
выход как POST с CSRF-защитой. OIDC-токены во frontend не хранятся. Для
локального запуска клиент Keycloak должен разрешать callback
`http://localhost:3000/api/auth/oidc/callback/`; готовый realm находится в
`sova-infra`.

API-клиенты и общий HTTP-транспорт находятся в `src/lib/api`. Запросы из
браузера используют относительный `/api`, чтобы session и CSRF cookies
оставались на том же домене. Доменная логика, хранение файлов и интеграции
выполняются в backend.

## Проверки

```bash
pnpm check
pnpm exec playwright install chromium  # один раз перед e2e
pnpm test:e2e
```

`pnpm check` запускает Prettier, ESLint, проверку типов, unit-тесты и сборку.
`pnpm test:e2e` дополнительно собирает приложение и запускает Playwright на
локальном порту 3100. Перед коммитом Husky проверяет staged-файлы, типы и
unit-тесты.

## Docker и релизы

```bash
docker build -t sova-frontend .
docker run --rm -p 3000:3000 sova-frontend
```

Этот образ содержит только frontend. Для авторизации и данных нужны backend,
Keycloak и маршрутизация из `sova-infra`. Dockerfile собирает standalone-версию
Next.js и запускает её от непривилегированного пользователя `nextjs`.

Push в `develop` запускает `.github/workflows/publish-image.yml`: после
`pnpm check` публикуются образы `ghcr.io/abat-voix/sova-frontend:dev` и
`sha-<commit>`, затем обновляется dev-стенд. В этом workflow отображаемая
версия сборки имеет формат `0.1.<github.run_number>`.

Git-тег вида `v1.2.3` запускает `.github/workflows/publish-release.yml`:
workflow проверяет проект и публикует
`ghcr.io/abat-voix/sova-frontend:v1.2.3`. Отображаемая версия такого образа
совпадает с тегом. Чтобы обновить production, дождитесь публикации образов
frontend и backend, затем укажите их теги в `sova-infra/release.prod.env` и
выпустите отдельный тег `sova-infra` по
[инструкции production](https://github.com/abat-voix/sova-infra/blob/develop/PRODUCTION.md).

Переменные `NEXT_PUBLIC_*` в браузерном коде фиксируются при сборке образа.
В частности, текущий Dockerfile не принимает `NEXT_PUBLIC_MAP_TILE_URL` как
build arg: для образа закрытого контура с внутренним источником тайлов сборку
нужно дополнить передачей этой переменной.
