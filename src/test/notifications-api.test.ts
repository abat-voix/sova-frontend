import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getNotificationKinds,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications/notifications";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(
  body: unknown = { count: 0, next: null, previous: null, results: [] },
) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
  );
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function calledUrl(fetchMock: ReturnType<typeof stubFetch>) {
  return String((fetchMock.mock.calls[0] as unknown[])?.[0]);
}

function calledInit(fetchMock: ReturnType<typeof stubFetch>) {
  return (fetchMock.mock.calls[0] as unknown[])?.[1] as RequestInit;
}

describe("notifications api", () => {
  it("requests the first page of the inbox filtered by kind", async () => {
    const fetchMock = stubFetch();

    await getNotifications({ kind: "deadline", page: 1, pageSize: 5 });

    expect(calledUrl(fetchMock)).toBe(
      "/api/notifications/inbox/?kind=deadline&page=1&page_size=5",
    );
  });

  it("omits the kind filter when all groups are selected", async () => {
    const fetchMock = stubFetch();

    await getNotifications({ kind: null, page: 1, pageSize: 5 });

    expect(calledUrl(fetchMock)).toBe(
      "/api/notifications/inbox/?page=1&page_size=5",
    );
  });

  it("loads the groups from the backend", async () => {
    const fetchMock = stubFetch([]);

    await getNotificationKinds();

    expect(calledUrl(fetchMock)).toBe("/api/notifications/inbox/kinds/");
  });

  it("marks one notification as read with the csrf token", async () => {
    const fetchMock = stubFetch({ id: "n-1", is_read: true });

    await markNotificationRead("n-1", "csrf");

    expect(calledUrl(fetchMock)).toBe("/api/notifications/inbox/n-1/read/");
    expect(calledInit(fetchMock)).toMatchObject({
      headers: expect.objectContaining({ "x-csrftoken": "csrf" }),
      method: "POST",
    });
  });

  it("marks all notifications as read", async () => {
    const fetchMock = stubFetch({ updated: 2 });

    await markAllNotificationsRead("csrf");

    expect(calledUrl(fetchMock)).toBe("/api/notifications/inbox/read-all/");
    expect(calledInit(fetchMock)).toMatchObject({ method: "POST" });
  });
});
