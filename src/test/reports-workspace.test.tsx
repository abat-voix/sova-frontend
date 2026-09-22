import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import type {
  ReportMeta,
  ReportPreviewResponse,
  ReportSummaryResponse,
} from "@/types/report";

const meta: ReportMeta = {
  active_stage_status: "current",
  available_columns: [
    { label: "Вуз", value: "university" },
    { label: "Ответственный", value: "responsible" },
  ],
  columns: ["university", "responsible"],
  filters: {},
  generated_at: "2026-09-22T10:00:00Z",
  period_basis: "created_at",
  report_type: "interactions",
  state_note: "Состояние на момент формирования отчёта",
};

const preview: ReportPreviewResponse = {
  count: 0,
  meta,
  page: 1,
  page_size: 50,
  results: [],
};

const summary: ReportSummaryResponse = {
  by_active_stage: [],
  by_process_status: [],
  by_responsible: [],
  by_university: [],
  interactions_count: 0,
  meta,
  products_count: 0,
  programs_count: 0,
  rows_count: 0,
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <ReportsWorkspace />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ReportsWorkspace", () => {
  it("loads the preview and summary for the default filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        const url = String(input);

        if (url.includes("/api/auth/me/")) {
          return jsonResponse({ authenticated: false, csrfToken: "token" });
        }
        if (url.includes("/api/reports/interactions/preview/")) {
          return jsonResponse(preview);
        }
        if (url.includes("/api/reports/interactions/summary/")) {
          return jsonResponse(summary);
        }

        return new Response("not found", { status: 404 });
      }),
    );

    renderWorkspace();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Отчёты по взаимодействиям с вузами",
      }),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(
        screen.getByText("Нет данных по выбранным фильтрам."),
      ).toBeInTheDocument(),
    );
    expect(screen.getAllByText("Вуз").length).toBeGreaterThan(0);
  });
});
