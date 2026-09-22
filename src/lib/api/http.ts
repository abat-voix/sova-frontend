/**
 * Транспорт для API. Бизнес-правил здесь нет: коды ошибок бэкенда доезжают до
 * интерфейса как есть, а он решает, каким сообщением их показать.
 *
 * Исключение — истёкшая сессия: показывать её как ошибку нечего, единственный
 * осмысленный ответ интерфейса один и тот же, поэтому вход инициирует транспорт.
 */

/**
 * Ошибка API с машинным кодом из тела ответа.
 *
 * Бэкенд отвечает на команды кодами вида `invalid_state`, `comment_required`,
 * `attachment_required` — интерфейс сопоставляет их с текстами, а не пытается
 * повторить проверки у себя.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly detail: string | null;
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    status: number,
    code: string | null,
    detail: string | null,
    message: string,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Сессия истекла — начат переход на вход.
 *
 * Отдельный тип, чтобы такие ошибки не ретраились и не показывались как сбой
 * сети: это штатное состояние приложения.
 */
export class SessionExpiredError extends Error {
  constructor() {
    super("Сессия истекла, требуется повторный вход.");
    this.name = "SessionExpiredError";
  }
}

const defaultLoginUrl = "/api/auth/oidc/authenticate/";

/**
 * На экране обычно висит несколько запросов сразу, и 401 придёт на каждый.
 * Флаг оставляет ровно одну навигацию вместо гонки переходов.
 */
let isRedirectingToLogin = false;

/**
 * Уводит на вход, сохранив текущую страницу в `next`.
 *
 * Без `next` Keycloak вернёт пользователя на корень приложения. Идём именно на
 * `login_url`, а не на `refresh_url`: молчаливое продление теряет страницу,
 * с которой всё началось.
 */
function goToLogin(loginUrl: string) {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;

  const next = encodeURIComponent(
    window.location.pathname + window.location.search,
  );

  // Адрес входа обслуживает бэкенд, а не роутер Next: нужен именно полный
  // переход, router.push() до Keycloak не дойдёт.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${loginUrl}?next=${next}`);
}

type ErrorBody = {
  code?: unknown;
  detail?: unknown;
  login_url?: unknown;
};

async function readErrorBody(response: Response) {
  try {
    const body = (await response.json()) as ErrorBody;

    const fieldErrors: Record<string, string[]> = {};
    const validation =
      body.detail && typeof body.detail === "object"
        ? (body.detail as Record<string, unknown>)
        : (body as Record<string, unknown>);
    for (const [field, value] of Object.entries(validation)) {
      if (Array.isArray(value)) fieldErrors[field] = value.map(String);
    }

    return {
      code: typeof body.code === "string" ? body.code : null,
      detail: typeof body.detail === "string" ? body.detail : null,
      fieldErrors,
      loginUrl: typeof body.login_url === "string" ? body.login_url : null,
    };
  } catch {
    return { code: null, detail: null, fieldErrors: {}, loginUrl: null };
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    // `Accept: text/html` бэкенд считает навигацией браузера и отвечает 302 на
    // Keycloak — запрос упрётся в чужой origin без CORS.
    headers: { accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const { code, detail, fieldErrors, loginUrl } =
      await readErrorBody(response);

    // `session_expired` — сессия жива, но id token протух; `not_authenticated`
    // — сессии нет совсем. Ответ интерфейса в обоих случаях один.
    if (code === "session_expired" || code === "not_authenticated") {
      goToLogin(loginUrl ?? defaultLoginUrl);

      throw new SessionExpiredError();
    }

    throw new ApiError(
      response.status,
      code,
      detail,
      `Request to ${url} failed with status ${response.status}`,
      fieldErrors,
    );
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

export function getJson<T>(url: string) {
  return request<T>(url);
}

export function postJson<T>(url: string, body: unknown, csrfToken: string) {
  return request<T>(url, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-csrftoken": csrfToken },
    method: "POST",
  });
}

/** Для загрузки файлов: `content-type` расставляет браузер вместе с boundary. */
export function postFormData<T>(
  url: string,
  body: FormData,
  csrfToken: string,
) {
  return request<T>(url, {
    body,
    headers: { "x-csrftoken": csrfToken },
    method: "POST",
  });
}

export function buildQuery(
  params: Record<string, string | number | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}
