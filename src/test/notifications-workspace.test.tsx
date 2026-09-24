import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/notifications",
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

import { NotificationsWorkspace } from "@/components/notifications/notifications-workspace";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import type {
  AppNotification,
  NotificationKindSummary,
} from "@/types/notification";

beforeEach(() => {
  navigation.replace.mockReset();
  navigation.search = "";
});

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
    count: 2,
    unread_count: 1,
  },
];

const unreadNotification: AppNotification = {
  id: "n-1",
  title: "Сроки — просрочено 1, скоро срок 0",
  text: "Просроченные действия:\n- МГУ — Этап — Подготовить КП",
  is_read: false,
  kind: "deadline",
  kind_label: "Сроки",
  link: "/interactions?interaction=i-1&process=p-1&action=a-1",
  created_at: "2026-09-24T09:00:00+03:00",
};

const readNotification: AppNotification = {
  ...unreadNotification,
  id: "n-2",
  title: "Сроки — просрочено 0, скоро срок 2",
  text: "",
  is_read: true,
  link: "",
};

const olderNotification: AppNotification = {
  ...readNotification,
  id: "n-old",
  title: "Старое уведомление",
  text: "Текст старого уведомления",
};

function page(results: AppNotification[]) {
  return { count: results.length, next: null, previous: null, results };
}

function stubApi(
  notifications: AppNotification[] = [unreadNotification, readNotification],
) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const body = url.startsWith("/api/auth/me/")
      ? { authenticated: true, csrfToken: "csrf", user: { id: 1 } }
      : url.startsWith("/api/notifications/inbox/kinds/")
        ? kinds
        : url.includes("/read")
          ? { updated: 1 }
          : url.startsWith("/api/notifications/inbox/n-old/")
            ? olderNotification
            : page(url.includes("search=") ? [] : notifications);

    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <NotificationsWorkspace />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function requestedUrls(fetchMock: ReturnType<typeof stubApi>) {
  return fetchMock.mock.calls.map((call) => String(call[0]));
}

describe("NotificationsWorkspace", () => {
  it("lists titles and asks to pick a notification", async () => {
    stubApi();

    renderWorkspace();

    expect(
      await screen.findByRole("button", { name: /просрочено 1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /просрочено 0/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Выберите уведомление слева, чтобы прочитать его целиком.",
      ),
    ).toBeInTheDocument();
  });

  it("puts the picked notification into the address", async () => {
    stubApi();

    renderWorkspace();

    fireEvent.click(
      await screen.findByRole("button", { name: /просрочено 0/ }),
    );

    expect(navigation.replace).toHaveBeenCalledWith(
      "/notifications?notification=n-2",
      { scroll: false },
    );
  });

  it("shows the full text, the link, and marks the notification as read", async () => {
    navigation.search = "notification=n-1";
    const fetchMock = stubApi();

    renderWorkspace();

    expect(
      await screen.findByRole("heading", { name: /просрочено 1/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/МГУ — Этап — Подготовить КП/, { selector: "p" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Перейти" })).toHaveAttribute(
      "href",
      "/interactions?interaction=i-1&process=p-1&action=a-1",
    );
    await waitFor(() =>
      expect(requestedUrls(fetchMock)).toContain(
        "/api/notifications/inbox/n-1/read/",
      ),
    );
  });

  it("does not mark an already read notification and hides an empty link", async () => {
    navigation.search = "notification=n-2";
    const fetchMock = stubApi();

    renderWorkspace();

    expect(
      await screen.findByText(
        "У уведомления нет текста — всё сказано в заголовке.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Перейти" })).toBeNull();
    expect(requestedUrls(fetchMock).some((url) => url.includes("/read/"))).toBe(
      false,
    );
  });

  it("loads a notification missing from the list separately", async () => {
    navigation.search = "notification=n-old";
    const fetchMock = stubApi();

    renderWorkspace();

    expect(
      await screen.findByText("Текст старого уведомления"),
    ).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain(
      "/api/notifications/inbox/n-old/",
    );
  });

  it("does not follow links outside the application", async () => {
    navigation.search = "notification=n-1";
    stubApi([{ ...unreadNotification, link: "javascript:alert(1)" }]);

    renderWorkspace();

    expect(
      await screen.findByRole("heading", { name: /просрочено 1/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Перейти" })).toBeNull();
  });

  it("searches by title and text", async () => {
    const fetchMock = stubApi();

    renderWorkspace();

    fireEvent.change(
      await screen.findByRole("searchbox", { name: "Поиск уведомлений" }),
      { target: { value: "МГУ" } },
    );

    await waitFor(() =>
      expect(
        requestedUrls(fetchMock).some((url) => url.includes("search=")),
      ).toBe(true),
    );
    expect(
      await screen.findByText("По вашему запросу ничего не найдено."),
    ).toBeInTheDocument();
  });

  it("marks all notifications as read", async () => {
    const fetchMock = stubApi();

    renderWorkspace();

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
