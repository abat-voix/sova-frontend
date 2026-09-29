import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ search: "" }));
const auth = vi.hoisted(() => ({
  permissions: ["catalog.import", "integrations.manage", "training.read"],
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    csrfToken: "csrf",
    user: {
      id: 1,
      isSuperuser: false,
      permissions: auth.permissions,
      role: "platform_admin",
    },
  }),
}));

import { LearnerImportWorkspace } from "@/components/training/learner-import-workspace";
import { LocaleProvider } from "@/providers/locale-provider";

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function stubApi() {
  const uploads: FormData[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url === "/api/training/streams/s1/")
        return json({
          id: "s1",
          name: "DevOps-01",
          program: { id: "p", name: "P" },
        });
      if (url === "/api/catalog/imports/headers/")
        return json({ headers: ["Фамилия", "Имя"] });
      if (url.startsWith("/api/catalog/import-mappings/by-type/learner/"))
        return json([
          {
            target_field: "last_name",
            label: "Фамилия",
            required: true,
            source_column: "Фамилия",
          },
          {
            target_field: "first_name",
            label: "Имя",
            required: true,
            source_column: "Имя",
          },
        ]);
      if (url === "/api/training/learners/import/") {
        uploads.push(init?.body as FormData);
        return json({
          created: 2,
          updated: 0,
          application: "a1",
          warnings: [],
        });
      }
      return json({ count: 0, next: null, previous: null, results: [] });
    }),
  );
  return uploads;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <LearnerImportWorkspace />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  navigation.search = "";
  auth.permissions = ["catalog.import", "integrations.manage", "training.read"];
});

describe("learner import workspace", () => {
  it("denies access without the import permission", () => {
    auth.permissions = ["training.read"];
    stubApi();
    renderWorkspace();

    expect(screen.getByText("Доступ ограничен")).toBeInTheDocument();
    expect(screen.queryByLabelText("В поток")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Все обучающиеся" }),
    ).toHaveAttribute("href", "/training/learners");
  });

  it("uploads to the stream from the link and links to the new application", async () => {
    navigation.search = "stream=s1";
    const uploads = stubApi();
    renderWorkspace();

    expect(
      await screen.findByText(/Будет создана заявка на этот поток/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("В поток")).toBeChecked();
    fireEvent.change(screen.getByLabelText("Файл xlsx/xls"), {
      target: { files: [new File(["x"], "users.xlsx")] },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Загрузить" }));

    await waitFor(() => expect(uploads).toHaveLength(1));
    expect(uploads[0].get("stream")).toBe("s1");
    expect(
      await screen.findByText("Создано: 2, обновлено: 0"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "«DevOps-01»" })).toHaveAttribute(
      "href",
      "/training/streams/s1",
    );
    expect(screen.getByRole("link", { name: "«Интеграции»" })).toHaveAttribute(
      "href",
      "/settings/integrations",
    );
  });

  it("opens the file step only after the first step is filled", async () => {
    stubApi();
    renderWorkspace();

    expect(screen.queryByLabelText("Файл xlsx/xls")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("В поток"));
    expect(screen.getByLabelText("Поток")).toBeInTheDocument();
    expect(screen.queryByLabelText("Файл xlsx/xls")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Без потока"));
    expect(screen.queryByLabelText("Поток")).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Файл xlsx/xls")).toBeInTheDocument();
  });

  it("uploads without a stream", async () => {
    const uploads = stubApi();
    renderWorkspace();

    fireEvent.click(screen.getByLabelText("Без потока"));
    fireEvent.change(await screen.findByLabelText("Файл xlsx/xls"), {
      target: { files: [new File(["x"], "users.xlsx")] },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Загрузить" }));

    await waitFor(() => expect(uploads).toHaveLength(1));
    expect(uploads[0].get("stream")).toBeNull();
  });
});
