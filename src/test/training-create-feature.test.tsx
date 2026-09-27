import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrainingCreateFeature } from "@/components/action-features/training-create-feature";
import { LocaleProvider } from "@/providers/locale-provider";

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function renderFeature() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <TrainingCreateFeature
          actionInstanceId="action-1"
          csrfToken="csrf"
          workflowInstanceId="workflow-1"
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function stubApi(initial: unknown) {
  const executed: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.includes("/features/training.create/initial/"))
        return json(initial);
      if (url.includes("/features/training.create/execute/")) {
        executed.push(JSON.parse(String(init?.body)));
        return json({
          execution: { id: "e1" },
          target: {
            type: "training_stream",
            id: "s9",
            data: { name: "DevOps-01" },
          },
        });
      }
      return json({});
    }),
  );
  return executed;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("training.create feature", () => {
  it("explains that a signed contract is required", async () => {
    stubApi({
      programs: [],
      has_signed_contract: false,
      instructors: [],
      stream: {},
    });
    renderFeature();

    expect(
      await screen.findByText(/нет подписанного договора/),
    ).toBeInTheDocument();
  });

  it("creates a stream for the only program and links to it", async () => {
    const executed = stubApi({
      programs: [{ id: "ip1", name: "DevOps-инженер", direction: "DevOps" }],
      has_signed_contract: true,
      instructors: [],
      stream: { name: "", starts_at: null, ends_at: null },
    });
    renderFeature();

    fireEvent.change(await screen.findByLabelText(/Название потока/), {
      target: { value: "DevOps-01" },
    });
    fireEvent.change(screen.getByLabelText(/Начало/), {
      target: { value: "2026-02-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Создать поток" }));

    await waitFor(() =>
      expect(executed[0]).toEqual({
        ends_at: null,
        instructors: [],
        interaction_program: "ip1",
        name: "DevOps-01",
        starts_at: "2026-02-01",
      }),
    );
    expect(
      await screen.findByRole("link", { name: "Открыть в разделе «Обучение»" }),
    ).toHaveAttribute("href", "/training/streams/s9");
  });
});
