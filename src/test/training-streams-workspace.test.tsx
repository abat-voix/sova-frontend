import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  search: "",
}));
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    csrfToken: "csrf",
    user: {
      id: 1,
      isSuperuser: false,
      permissions: auth.permissions,
      role: "kam",
    },
  }),
}));

import { TrainingStreamPage } from "@/components/training/training-stream-page";
import { TrainingStreamsWorkspace } from "@/components/training/training-streams-workspace";
import { LocaleProvider } from "@/providers/locale-provider";
import {
  kamPermissions,
  observerPermissions,
} from "@/test/fixtures/permissions";
import type { TrainingApplication, TrainingStream } from "@/types/training";

const stream: TrainingStream = {
  id: "s1",
  name: "DevOps-01",
  interaction_program: "ip1",
  interaction: "i1",
  interaction_number: "7-010126",
  organization: "u1",
  b2c_client: null,
  counterparty_name: "МГУ",
  program: { id: "p1", name: "DevOps-инженер" },
  starts_at: "2026-02-01",
  ends_at: null,
  status: "enrollment_open",
  instructors: [],
  applications_count: 1,
  participants_count: 1,
  paid_count: 0,
  created_by: null,
  created_at: "2026-01-10T10:00:00+03:00",
  updated_at: "2026-01-10T10:00:00+03:00",
};

const application: TrainingApplication = {
  id: "a1",
  stream: "s1",
  stream_name: "DevOps-01",
  status: "new",
  comment: "",
  participants: [
    {
      id: "al1",
      application: "a1",
      learner: {
        id: "l1",
        full_name: "Иванов Михаил",
        last_name: "Иванов",
        first_name: "Михаил",
        middle_name: "",
        email: "m***@mail.ru",
        phone: "+7 *** ***-**-34",
        consent_at: null,
        is_active: true,
        created_at: "2026-01-10T10:00:00+03:00",
        updated_at: "2026-01-10T10:00:00+03:00",
      },
      is_paid: false,
      is_enrolled: false,
      created_at: "2026-01-10T10:00:00+03:00",
      updated_at: "2026-01-10T10:00:00+03:00",
    },
  ],
  created_by: null,
  created_at: "2026-01-10T10:00:00+03:00",
  updated_at: "2026-01-10T10:00:00+03:00",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function stubApi() {
  const requests: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      requests.push({
        body: init?.body ? JSON.parse(String(init.body)) : null,
        method,
        url,
      });
      if (url.startsWith("/api/training/streams/s1/")) return json(stream);
      if (url.startsWith("/api/training/streams/?"))
        return json({
          count: 1,
          next: null,
          previous: null,
          results: [stream],
        });
      if (url.startsWith("/api/training/applications/?"))
        return json({
          count: 1,
          next: null,
          previous: null,
          results: [application],
        });
      if (url === "/api/training/application-learners/al1/")
        return json({ ...application.participants[0], is_paid: true });
      if (url === "/api/training/applications/" && method === "POST")
        return json({ ...application, id: "a2", participants: [] }, 201);
      return json({ count: 0, next: null, previous: null, results: [] });
    }),
  );
  return requests;
}

function renderWith(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>{node}</LocaleProvider>
    </QueryClientProvider>,
  );
}

const renderWorkspace = () => renderWith(<TrainingStreamsWorkspace />);
const renderStream = () => renderWith(<TrainingStreamPage streamId="s1" />);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  navigation.search = "";
  navigation.push.mockReset();
  navigation.replace.mockReset();
});

describe("training streams workspace", () => {
  it("lists streams with counterparty and participants", async () => {
    auth.permissions = kamPermissions;
    stubApi();
    renderWorkspace();

    const row = (await screen.findByText("DevOps-01")).closest("tr");
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLElement).getByText("МГУ · № 7-010126"),
    ).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText("1 / 0")).toBeInTheDocument();
    expect(screen.getByText(/кнопкой «Создать обучение»/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DevOps-01" })).toHaveAttribute(
      "href",
      "/training/streams/s1",
    );

    fireEvent.click(within(row as HTMLElement).getByText("МГУ · № 7-010126"));
    expect(navigation.push).toHaveBeenCalledWith("/training/streams/s1");
  });

  it("redirects an old ?stream= link to the stream page", async () => {
    auth.permissions = kamPermissions;
    navigation.search = "stream=s1";
    stubApi();
    renderWorkspace();

    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith("/training/streams/s1"),
    );
  });

  it("marks a participant as paid on the stream page", async () => {
    auth.permissions = kamPermissions;
    const requests = stubApi();
    renderStream();

    expect(
      await screen.findByRole("heading", { name: "DevOps-01" }),
    ).toBeInTheDocument();

    const paid = await screen.findByLabelText("Оплачено: Иванов Михаил");
    fireEvent.click(paid);

    await waitFor(() =>
      expect(
        requests.find(
          (request) =>
            request.url === "/api/training/application-learners/al1/" &&
            request.method === "PATCH",
        )?.body,
      ).toEqual({ is_paid: true }),
    );
  });

  it("creates an application for the stream", async () => {
    auth.permissions = kamPermissions;
    const requests = stubApi();
    renderStream();

    fireEvent.click(
      await screen.findByRole("button", { name: "Создать заявку" }),
    );
    fireEvent.change(
      screen.getByLabelText("Комментарий к заявке (необязательно)"),
      {
        target: { value: "Группа 1" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Создать" }));

    await waitFor(() =>
      expect(
        requests.find(
          (request) =>
            request.url === "/api/training/applications/" &&
            request.method === "POST",
        )?.body,
      ).toEqual({ comment: "Группа 1", stream: "s1" }),
    );
  });

  it("is read-only for an observer", async () => {
    auth.permissions = observerPermissions;
    stubApi();
    renderStream();

    expect(
      await screen.findByLabelText("Оплачено: Иванов Михаил"),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Создать заявку" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Изменить" })).toBeNull();
    expect(
      screen.queryByText("Загрузить пользователей в этот поток"),
    ).toBeNull();
  });
});
