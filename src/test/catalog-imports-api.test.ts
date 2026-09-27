import { afterEach, describe, expect, it, vi } from "vitest";

import {
  readCatalogImportHeaders,
  readImportFailure,
  saveCatalogImportMapping,
  uploadCatalogImport,
} from "@/lib/api/catalog/catalog-imports";

function stubResponse(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

const file = new File(["x"], "vendors.xlsx");

describe("catalog imports API", () => {
  it("sends the file for headers as multipart", async () => {
    const fetchMock = stubResponse({ headers: ["Вендор"] });

    await expect(readCatalogImportHeaders(file, "t")).resolves.toEqual([
      "Вендор",
    ]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/catalog/imports/headers/");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("uploads the file with its catalog type", async () => {
    const fetchMock = stubResponse({
      catalog_type: "vendor",
      created: 1,
      updated: 0,
      warnings: [],
    });

    await uploadCatalogImport("vendor", file, "t");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = init.body as FormData;
    expect(url).toBe("/api/catalog/imports/");
    expect(body.get("catalog_type")).toBe("vendor");
    expect((body.get("file") as File).name).toBe("vendors.xlsx");
  });

  it("puts the whole mapping of a type", async () => {
    const fetchMock = stubResponse([]);

    await saveCatalogImportMapping("vendor", { name: "Вендор" }, "t");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/catalog/import-mappings/by-type/vendor/");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({
      mappings: { name: "Вендор" },
    });
  });

  it("reads row errors of a failed import", async () => {
    stubResponse(
      {
        code: "import_failed",
        detail: "Импорт отменён, ошибок: 150",
        errors: [{ row: 3, message: "вендор не найден: X" }],
        errors_total: 150,
      },
      400,
    );

    const error = await uploadCatalogImport("product", file, "t").catch(
      (caught: unknown) => caught,
    );

    expect(readImportFailure(error)).toEqual({
      code: "import_failed",
      detail: "Импорт отменён, ошибок: 150",
      errors: [{ row: 3, message: "вендор не найден: X" }],
      errorsTotal: 150,
    });
  });

  it("returns null for errors that are not import failures", () => {
    expect(readImportFailure(new Error("network"))).toBeNull();
  });
});
