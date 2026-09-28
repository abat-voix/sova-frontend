import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InteractionTrainingSection } from "@/components/training/interaction-training-section";
import { LocaleProvider } from "@/providers/locale-provider";

function stubStreams(results: unknown[]) {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      urls.push(String(input));
      return new Response(
        JSON.stringify({
          count: results.length,
          next: null,
          previous: null,
          results,
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    }),
  );
  return urls;
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <InteractionTrainingSection interactionId="i1" />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("interaction training section", () => {
  it("lists streams of the interaction with links to the training section", async () => {
    const urls = stubStreams([
      {
        id: "s1",
        name: "DevOps-01",
        program: { id: "p1", name: "DevOps-инженер" },
        status: "enrollment_open",
        participants_count: 12,
        paid_count: 8,
      },
    ]);
    renderSection();

    expect(
      await screen.findByRole("link", { name: "Открыть поток: DevOps-01" }),
    ).toHaveAttribute("href", "/training/streams/s1");
    expect(screen.getByText("участников: 12, оплатили: 8")).toBeInTheDocument();
    expect(screen.getByText("Идёт набор")).toBeInTheDocument();
    expect(urls[0]).toContain("interaction__ids=i1");
  });

  it("explains how a stream appears", async () => {
    stubStreams([]);
    renderSection();

    expect(
      await screen.findByText(/кнопкой «Создать обучение»/),
    ).toBeInTheDocument();
  });
});
