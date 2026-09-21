/**
 * Транспорт для API. Бизнес-правил здесь нет: коды ошибок бэкенда доезжают до
 * интерфейса как есть, а он решает, каким сообщением их показать.
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

  constructor(
    status: number,
    code: string | null,
    detail: string | null,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

type ErrorBody = {
  code?: unknown;
  detail?: unknown;
};

async function readErrorBody(response: Response) {
  try {
    const body = (await response.json()) as ErrorBody;
    const code = typeof body.code === "string" ? body.code : null;
    const detail = typeof body.detail === "string" ? body.detail : null;

    return { code, detail };
  } catch {
    return { code: null, detail: null };
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...init,
    headers: { accept: "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const { code, detail } = await readErrorBody(response);
    throw new ApiError(
      response.status,
      code,
      detail,
      `Request to ${url} failed with status ${response.status}`,
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
