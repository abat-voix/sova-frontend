import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
}));
vi.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ csrfToken: "csrf" }),
}));

import { IntegrationMappingPage } from "@/components/integrations/integration-mapping-page";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

const mapping = {
  id: "m1",
  name: "Enrollment",
  system: "lms",
  eventType: "student.enrolled",
  direction: "incoming",
  entity: "student",
  isActive: false,
  version: 1,
  rules: [],
  createdAt: "2026-09-28T10:00:00Z",
  updatedAt: "2026-09-28T10:00:00Z",
};

function stubApi() {
  const requests: { method: string; url: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      requests.push({ method, url });
      if (url === "/api/integrations/v1/metadata/entities/")
        return json([
          {
            code: "student",
            label: "Студент",
            serializer: "StudentSerializer",
            fields: [],
          },
        ]);
      if (url === "/api/integrations/v1/systems/")
        return json([{ code: "lms", label: "LMS" }]);
      if (url === "/api/integrations/v1/mappings/" && method === "POST")
        return json(mapping, 201);
      if (url === "/api/integrations/v1/mappings/m1/") return json(mapping);
      return json([]);
    }),
  );
  return requests;
}

function renderPage(mappingId?: string) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <IntegrationMappingPage mappingId={mappingId} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  navigation.push.mockReset();
});

describe("IntegrationMappingPage", () => {
  it("returns to the list after creating a mapping", async () => {
    const requests = stubApi();
    renderPage();
    fireEvent.change(await screen.findByLabelText("Название"), {
      target: { value: "Enrollment" },
    });
    fireEvent.change(screen.getByLabelText("Система"), {
      target: { value: "lms" },
    });
    fireEvent.change(screen.getByLabelText("event_type"), {
      target: { value: "student.enrolled" },
    });
    fireEvent.change(screen.getByLabelText("Сущность CRM"), {
      target: { value: "student" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));

    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/settings/integrations"),
    );
    expect(requests).toContainEqual({
      method: "POST",
      url: "/api/integrations/v1/mappings/",
    });
  });

  it("opens an existing mapping and returns to the list on close", async () => {
    stubApi();
    renderPage("m1");
    expect(await screen.findByLabelText("Название")).toHaveValue("Enrollment");
    expect(
      screen.getByRole("heading", { name: "Редактирование mapping" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(navigation.push).toHaveBeenCalledWith("/settings/integrations");
  });
});
