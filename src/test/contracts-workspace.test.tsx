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

import { ContractsWorkspace } from "@/components/contracts/contracts-workspace";
import { AuthProvider } from "@/providers/auth-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import type { Contract } from "@/types/contract";
import type { ContractFile } from "@/types/contract-file";

const contract: Contract = {
  id: "k1",
  file_name: "dogovor-v2.pdf",
  download_url: "/api/interactions/contracts/k1/download/",
  files_count: 2,
  contract_number: "Д-42",
  sent_at: "2026-09-01",
  corrected_at: null,
  signed_at: "2026-09-10",
  interaction: {
    id: "i1",
    university: { id: "u1", name: "Тюменский университет" },
    b2c_client: null,
  },
  created_at: "2026-08-30T10:00:00+03:00",
  updated_at: "2026-09-10T10:00:00+03:00",
};

const files: ContractFile[] = [
  {
    id: "f2",
    contract: "k1",
    original_name: "dogovor-v2.pdf",
    size: 2048,
    content_type: "application/pdf",
    uploaded_at: "2026-09-10T10:00:00+03:00",
    uploaded_by: { id: 1, full_name: "Иван Иванов" },
    is_current: true,
  },
  {
    id: "f1",
    contract: "k1",
    original_name: "dogovor-v1.pdf",
    size: 1024,
    content_type: "application/pdf",
    uploaded_at: "2026-09-01T10:00:00+03:00",
    uploaded_by: null,
    is_current: false,
  },
];

const emptyPage = { count: 0, next: null, previous: null, results: [] };

function stubApi() {
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      urls.push(url);

      const body = url.startsWith("/api/auth/me/")
        ? { authenticated: false }
        : url.startsWith("/api/interactions/contracts/k1/")
          ? contract
          : url.startsWith("/api/interactions/contracts/?")
            ? { count: 1, next: null, previous: null, results: [contract] }
            : url.startsWith("/api/interactions/contract-files/?")
              ? { count: 2, next: null, previous: null, results: files }
              : emptyPage;

      return new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }),
  );

  return urls;
}

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AuthProvider>
          <ContractsWorkspace />
        </AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

function lastListUrl(urls: string[]) {
  const listUrls = urls.filter((url) =>
    url.startsWith("/api/interactions/contracts/?"),
  );

  return new URL(listUrls[listUrls.length - 1], "http://localhost");
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ContractsWorkspace", () => {
  it("lists contracts with the counterparty, stage and a file download", async () => {
    stubApi();
    renderWorkspace();

    expect(await screen.findByText("Д-42")).toBeInTheDocument();
    expect(screen.getByText("Тюменский университет")).toBeInTheDocument();

    const row = screen.getByText("Д-42").closest("tr") as HTMLElement;
    expect(within(row).getByText("Подписан")).toBeInTheDocument();
    expect(
      within(row).getByRole("link", {
        name: "Скачать текущий файл: dogovor-v2.pdf",
      }),
    ).toHaveAttribute("href", "/api/interactions/contracts/k1/download/");
  });

  it("sends the signing filter to the backend", async () => {
    const urls = stubApi();
    renderWorkspace();
    await screen.findByText("Д-42");

    fireEvent.click(screen.getByRole("button", { name: "Не подписаны" }));

    await waitFor(() =>
      expect(lastListUrl(urls).searchParams.get("is_signed")).toBe("false"),
    );
  });

  it("shows every file version with its own download link", async () => {
    stubApi();
    renderWorkspace();

    fireEvent.click(await screen.findByText("Д-42"));

    const drawer = await screen.findByRole("dialog");
    expect(
      within(drawer).getByRole("heading", { name: "Д-42" }),
    ).toBeInTheDocument();
    expect(
      await within(drawer).findByText("dogovor-v1.pdf"),
    ).toBeInTheDocument();
    expect(within(drawer).getByText("Текущий")).toBeInTheDocument();
    expect(
      within(drawer).getByRole("link", { name: "Скачать: dogovor-v1.pdf" }),
    ).toHaveAttribute("href", "/api/interactions/contract-files/f1/download/");
    expect(
      within(drawer).getByRole("button", { name: "Загрузить новую версию" }),
    ).toBeInTheDocument();
  });
});
