import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationsWidget } from "@/components/notifications/notifications-widget";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import type {
  AppNotification,
  NotificationKindSummary,
} from "@/types/notification";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

const kinds: NotificationKindSummary[] = [
  {
    value: "deadline",
    label: "Сроки",
    icon: "calendar-clock",
    count: 1,
    unread_count: 1,
  },
  {
    value: "assignment",
    label: "Назначения",
    icon: "user-check",
    count: 0,
    unread_count: 0,
  },
  {
    value: "custom",
    label: "Новая группа",
    icon: "unknown-icon",
    count: 1,
    unread_count: 0,
  },
];

const deadlineNotification: AppNotification = {
  id: "n-1",
  title: "Сроки — просрочено 1, скоро срок 0",
  text: "Просроченные действия:\n- МГУ — Этап — Подготовить КП",
  is_read: false,
  kind: "deadline",
  kind_label: "Сроки",
  link: "",
  created_at: "2026-09-24T09:00:00+03:00",
};

function page(results: AppNotification[]) {
  return { count: results.length, next: null, previous: null, results };
}

function stubApi(notifications: AppNotification[] = [deadlineNotification]) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const body = url.startsWith("/api/auth/me/")
      ? { authenticated: true, csrfToken: "csrf", user: { id: 1 } }
      : url.startsWith("/api/notifications/inbox/kinds/")
        ? kinds
        : url.includes("/read")
          ? { updated: 1 }
          : page(url.includes("kind=custom") ? [] : notifications);

    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function renderWidget() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <NotificationsWidget />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function requestedUrls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.map((call) => String(call[0]));
}

describe("NotificationsWidget", () => {
  it("shows the latest notifications and the unread counter", async () => {
    stubApi();

    renderWidget();

    expect(
      await screen.findByText("Сроки — просрочено 1, скоро срок 0"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Уведомления" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Непрочитанных: 1")).toBeInTheDocument();
  });

  it("builds group filters from the backend and hides empty groups", async () => {
    const fetchMock = stubApi();

    renderWidget();

    fireEvent.click(
      await screen.findByRole("button", { name: /Новая группа/ }),
    );

    expect(screen.queryByRole("button", { name: /Назначения/ })).toBeNull();
    await waitFor(() =>
      expect(
        requestedUrls(fetchMock).some((url) => url.includes("kind=custom")),
      ).toBe(true),
    );
    expect(
      await screen.findByText(
        "Здесь появятся напоминания о сроках, назначениях и системные сообщения.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the placeholder text when there are no notifications", async () => {
    stubApi([]);

    renderWidget();

    expect(
      await screen.findByText(
        "Здесь появятся напоминания о сроках, назначениях и системные сообщения.",
      ),
    ).toBeInTheDocument();
  });

  it("opens a notification on the notifications tab without marking it read", async () => {
    const fetchMock = stubApi([
      {
        ...deadlineNotification,
        link: "/interactions?interaction=i-1&process=p-1&action=a-1",
      },
    ]);

    renderWidget();

    const link = await screen.findByRole("link", {
      name: /Сроки — просрочено 1/,
    });
    expect(link).toHaveAttribute("href", "/notifications?notification=n-1");
    fireEvent.click(link);

    expect(requestedUrls(fetchMock).some((url) => url.includes("/read"))).toBe(
      false,
    );
  });

  it("links to all notifications", async () => {
    stubApi();

    renderWidget();

    expect(
      await screen.findByRole("link", { name: "Все уведомления" }),
    ).toHaveAttribute("href", "/notifications");
  });

  it("marks all notifications as read", async () => {
    const fetchMock = stubApi();

    renderWidget();

    fireEvent.click(
      await screen.findByRole("button", { name: "Прочитать все" }),
    );

    await waitFor(() =>
      expect(requestedUrls(fetchMock)).toContain(
        "/api/notifications/inbox/read-all/",
      ),
    );
  });
});
