import { expect, test, type Page } from "@playwright/test";

async function mockAuthenticatedUser(page: Page) {
  await page.route("**/api/auth/me/", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        authenticated: true,
        csrfToken: "csrf-token",
        user: {
          id: 1,
          email: "owl@example.com",
          firstName: "Сова",
          lastName: "",
          displayName: "Сова",
          isStaff: false,
          roles: [],
        },
      },
      status: 200,
    });
  });
}

const universities = [
  {
    id: "bmstu",
    name: "МГТУ им. Н. Э. Баумана",
    inn: null,
    external_code: null,
    email: "",
    phone: "",
    is_active: true,
    created_at: "2026-09-20T17:18:08.681266+03:00",
    updated_at: "2026-09-20T17:18:08.681272+03:00",
    lat: "55.765900",
    lon: "37.684800",
    city: "Москва",
  },
  {
    id: "msu",
    name: "МГУ имени М. В. Ломоносова",
    inn: null,
    external_code: null,
    email: "",
    phone: "",
    is_active: true,
    created_at: "2026-09-20T17:18:08.681266+03:00",
    updated_at: "2026-09-20T17:18:08.681272+03:00",
    lat: "55.703300",
    lon: "37.530700",
    city: "Москва",
  },
  {
    id: "hse",
    name: "Национальный исследовательский университет ВШЭ",
    inn: null,
    external_code: null,
    email: "",
    phone: "",
    is_active: false,
    created_at: "2026-09-20T17:18:08.681266+03:00",
    updated_at: "2026-09-20T17:18:08.681272+03:00",
    lat: "55.761800",
    lon: "37.633600",
    city: "Москва",
  },
  {
    id: "itmo",
    name: "Университет ИТМО",
    inn: null,
    external_code: "https://ror.org/01gfvk061",
    email: "info@itmo.ru",
    phone: "",
    is_active: true,
    created_at: "2026-09-20T17:18:08.681266+03:00",
    updated_at: "2026-09-20T17:18:08.681272+03:00",
    lat: "59.956100",
    lon: "30.309000",
    city: "Санкт-Петербург",
  },
];

async function mockUniversitiesApi(page: Page) {
  await page.route("**/api/catalog/universities/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.endsWith("/map/")) {
      const search = url.searchParams.get("search")?.toLocaleLowerCase("ru");
      const filteredUniversities = search
        ? universities.filter((university) =>
            [
              university.name,
              university.inn,
              university.external_code,
              university.email,
            ].some((value) => value?.toLocaleLowerCase("ru").includes(search)),
          )
        : universities;
      await route.fulfill({
        contentType: "application/json",
        json: filteredUniversities.map(({ id, lat, lon }) => ({
          id,
          lat,
          lon,
        })),
      });
      return;
    }

    const id = url.pathname.match(/\/universities\/([^/]+)\/$/)?.[1];
    if (id) {
      await route.fulfill({
        contentType: "application/json",
        json: universities.find((university) => university.id === id),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      json: {
        count: universities.length,
        next: null,
        previous: null,
        results: universities,
      },
    });
  });
}

// Solid magenta tiles keep the map opaque without reaching the tile server, and
// make map pixels trivially recognisable: only tiles have a zero green channel.
async function stubMapTiles(page: Page) {
  await page.route("**/tile.openstreetmap.org/**", async (route) => {
    await route.fulfill({
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#ff00ff"/></svg>',
      contentType: "image/svg+xml",
    });
  });
}

async function readGreenChannel(page: Page, x: number, y: number) {
  const screenshot = await page.screenshot();

  return page.evaluate(
    async ({ dataUrl, point }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);

      return context.getImageData(point.x, point.y, 1, 1).data[1];
    },
    {
      dataUrl: `data:image/png;base64,${screenshot.toString("base64")}`,
      point: { x, y },
    },
  );
}

async function openMapView(page: Page) {
  await page.goto("/organizations");
  await expect(
    page.getByRole("heading", { level: 1, name: "Организации" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Карта" }).click();

  await expect(page.getByRole("region", { name: "Карта вузов" })).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
}

test("switches organizations from the list to the university map", async ({
  page,
}) => {
  await mockAuthenticatedUser(page);
  await mockUniversitiesApi(page);

  await page.goto("/organizations");
  await expect(
    page.getByRole("heading", { level: 1, name: "Организации" }),
  ).toBeVisible();
  await expect(page.getByText("4 организаций")).toBeVisible();

  await page.getByRole("button", { name: "Карта" }).click();

  await expect(page.getByRole("region", { name: "Карта вузов" })).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  await expect(page.locator(".leaflet-attribution-flag")).toHaveCount(0);

  const filteredMapRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      url.pathname.endsWith("/api/catalog/universities/map/") &&
      url.searchParams.get("search") === "ИТМО"
    );
  });
  await page
    .getByRole("searchbox", { name: "Поиск университетов" })
    .fill("ИТМО");
  await filteredMapRequest;
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1);

  await page.getByRole("button", { name: "Организация itmo" }).click();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Университет ИТМО",
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test.describe("mobile", () => {
  test.use({ viewport: { height: 844, width: 390 } });

  test("keeps the navigation drawer above the map", async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockUniversitiesApi(page);
    await stubMapTiles(page);
    await openMapView(page);

    await page.getByRole("button", { name: "Открыть навигацию" }).click();
    await expect(
      page.getByRole("button", { name: "Закрыть навигацию" }).first(),
    ).toBeVisible();

    // The drawer footer overlaps the map vertically: without its own stacking
    // context the map paints over it, and this pixel turns magenta.
    expect(await readGreenChannel(page, 144, 790)).toBeGreaterThan(200);

    // Markers and map controls also capture clicks meant for the drawer.
    await page
      .getByRole("navigation", { name: "Основная навигация" })
      .getByRole("link", { name: "Контакты", exact: true })
      .click({ timeout: 5000 });

    await expect(page).toHaveURL(/\/contacts$/);
  });

  test("opens the selected organization in a sheet", async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockUniversitiesApi(page);
    await openMapView(page);

    await expect(
      page.getByRole("complementary", { name: "Выбранный вуз" }),
    ).toBeHidden();

    await page.getByRole("button", { name: "Организация itmo" }).click();

    const sheet = page.getByRole("dialog", { name: "Университет ИТМО" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Санкт-Петербург")).toBeVisible();
    await expect(sheet.getByText("info@itmo.ru")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });
});
