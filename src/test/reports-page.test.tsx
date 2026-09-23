import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.stubGlobal(
  "fetch",
  vi.fn(() =>
    Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: "boom" }),
    } as Response),
  ),
);

import { ReportsPage } from "@/components/reports/reports-page";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("ReportsPage", () => {
  it("renders the filters and heading without crashing", () => {
    renderWithClient(<ReportsPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Отчёты по взаимодействиям с вузами",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Скачать")).toBeInTheDocument();
  });
});
