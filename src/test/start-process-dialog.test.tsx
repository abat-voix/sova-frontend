import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StartProcessDialog } from "@/components/interactions/start-process-dialog";
import { LocaleProvider } from "@/providers/locale-provider";
import type { WorkflowAudience } from "@/types/workflow-board";

type Call = { body: unknown; url: string };

const workflows = {
  count: 1,
  next: null,
  previous: null,
  results: [{ code: "demo-linear", id: "wf-1", name: "Демо: линейный путь" }],
};

function stubFetch(failure?: { code: string; detail: string; status: number }) {
  const calls: Call[] = [];
  const listUrls: string[] = [];

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (init?.method === "POST") {
        calls.push({ body: JSON.parse(String(init.body)), url });

        if (failure) {
          return new Response(
            JSON.stringify({ code: failure.code, detail: failure.detail }),
            {
              headers: { "content-type": "application/json" },
              status: failure.status,
            },
          );
        }

        return new Response(JSON.stringify({ id: "instance-1" }), {
          headers: { "content-type": "application/json" },
          status: 201,
        });
      }

      listUrls.push(url);

      return new Response(JSON.stringify(workflows), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
  );

  vi.stubGlobal("fetch", fetchMock);

  return { calls, listUrls };
}

function renderDialog(audience: WorkflowAudience = "b2b") {
  const onStarted = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <StartProcessDialog
          audience={audience}
          csrfToken="csrf"
          interactionId="int-1"
          onClose={() => undefined}
          onStarted={onStarted}
        />
      </LocaleProvider>
    </QueryClientProvider>,
  );

  return { onStarted };
}

async function pickWorkflow() {
  fireEvent.click(screen.getByRole("combobox", { name: "Шаблон workflow" }));
  fireEvent.click(
    await screen.findByRole("option", { name: "Демо: линейный путь" }),
  );
}

function startButton() {
  return screen.getByRole("button", { name: "Запустить" });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StartProcessDialog", () => {
  it("starts the process for the chosen workflow", async () => {
    const { calls } = stubFetch();
    const { onStarted } = renderDialog();

    expect(startButton()).toBeDisabled();

    await pickWorkflow();
    await waitFor(() => expect(startButton()).toBeEnabled());
    fireEvent.click(startButton());

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith("instance-1"));
    expect(calls).toEqual([
      {
        body: { interaction: "int-1", workflow: "wf-1" },
        url: "/api/processes/workflow-instances/",
      },
    ]);
  });

  it("only offers active workflows of the matching audience", async () => {
    const { listUrls } = stubFetch();
    renderDialog("b2c");

    fireEvent.click(screen.getByRole("combobox", { name: "Шаблон workflow" }));

    // audience и is_active снимают audience_mismatch и workflow_inactive
    // заранее. Проверяем полное имя параметра: подстрока `active=true` нашлась
    // бы и в устаревшем, и в новом.
    await waitFor(() => expect(listUrls).not.toHaveLength(0));
    expect(listUrls[0]).toContain("/api/workflows/workflows/");
    expect(listUrls[0]).toContain("is_active=true");
    expect(listUrls[0]).toContain("audience=b2c");
  });

  it("explains a 409 from the engine instead of a generic failure", async () => {
    stubFetch({
      code: "already_started",
      detail: "Этот workflow уже запущен для взаимодействия.",
      status: 409,
    });
    const { onStarted } = renderDialog();

    await pickWorkflow();
    await waitFor(() => expect(startButton()).toBeEnabled());
    fireEvent.click(startButton());

    expect(
      await screen.findByText("Этот шаблон уже запущен для взаимодействия."),
    ).toBeInTheDocument();
    expect(onStarted).not.toHaveBeenCalled();
  });

  it("explains an empty workflow", async () => {
    stubFetch({
      code: "empty_workflow",
      detail: "В workflow нет активных этапов.",
      status: 400,
    });
    renderDialog();

    await pickWorkflow();
    await waitFor(() => expect(startButton()).toBeEnabled());
    fireEvent.click(startButton());

    expect(
      await screen.findByText("В шаблоне нет активных этапов."),
    ).toBeInTheDocument();
  });
});
