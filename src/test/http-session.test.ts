import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Флаг «переход уже начат» живёт в модуле, поэтому каждый тест берёт свежий
 * экземпляр модуля вместо того, чтобы сбрасывать флаг тестовой функцией.
 */
async function freshHttp() {
  vi.resetModules();

  return import("@/lib/api/http");
}

function stubResponse(body: unknown, status: number) {
  const fetchMock = vi.fn<
    (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  >(
    async () =>
      new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status,
      }),
  );

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

const expiredBody = {
  code: "session_expired",
  detail: "Сессия истекла, требуется повторный вход.",
  login_url: "/api/auth/oidc/authenticate/",
  refresh_url: "http://localhost:8080/realms/sova/…&prompt=none",
};

let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      assign,
      pathname: "/interactions",
      search: "?selected=7",
    },
    writable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("session expiry", () => {
  it("sends the user to login_url with the current page in next", async () => {
    stubResponse(expiredBody, 401);
    const { getJson, SessionExpiredError } = await freshHttp();

    await expect(getJson("/api/interactions/interactions/")).rejects.toThrow(
      SessionExpiredError,
    );
    expect(assign).toHaveBeenCalledWith(
      "/api/auth/oidc/authenticate/?next=%2Finteractions%3Fselected%3D7",
    );
  });

  it("treats a missing session the same way", async () => {
    stubResponse({ code: "not_authenticated", detail: "Нет сессии." }, 403);
    const { getJson, SessionExpiredError } = await freshHttp();

    await expect(getJson("/api/interactions/interactions/")).rejects.toThrow(
      SessionExpiredError,
    );
    // Тело без login_url — уходим на адрес входа по умолчанию.
    expect(assign).toHaveBeenCalledWith(
      "/api/auth/oidc/authenticate/?next=%2Finteractions%3Fselected%3D7",
    );
  });

  it("navigates once when a screenful of requests fails together", async () => {
    stubResponse(expiredBody, 401);
    const { getJson } = await freshHttp();

    await Promise.allSettled([
      getJson("/api/catalog/directions/"),
      getJson("/api/catalog/programs/"),
      getJson("/api/interactions/interactions/"),
    ]);

    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("never asks the backend for html", async () => {
    const fetchMock = stubResponse({ results: [] }, 200);
    const { getJson } = await freshHttp();

    await getJson("/api/catalog/directions/");

    const headers = fetchMock.mock.calls[0][1]?.headers as Record<
      string,
      string
    >;
    // text/html бэкенд считает навигацией и отвечает 302 на Keycloak.
    expect(headers.accept).toBe("application/json");
    expect(JSON.stringify(headers)).not.toContain("text/html");
  });

  it("leaves other API errors to the interface", async () => {
    stubResponse(
      { code: "permission_denied", detail: "Недостаточно прав." },
      403,
    );
    const { ApiError, getJson } = await freshHttp();

    const error = await getJson("/api/users/").catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).code).toBe(
      "permission_denied",
    );
    expect((error as InstanceType<typeof ApiError>).detail).toBe(
      "Недостаточно прав.",
    );
    // Отказ по роли — не повод уводить со страницы.
    expect(assign).not.toHaveBeenCalled();
  });

  it("sends cookies with every API request", async () => {
    const fetchMock = stubResponse({ results: [] }, 200);
    const { postJson } = await freshHttp();

    await postJson("/api/interactions/interactions/", { comment: "" }, "csrf");

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: "include",
    });
  });
});
