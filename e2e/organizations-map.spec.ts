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

  await page.goto("/organizations");
  await expect(
    page.getByRole("heading", { level: 1, name: "Организации" }),
  ).toBeVisible();
  await expect(page.getByText("4 организации")).toBeVisible();

  await page.getByRole("button", { name: "Карта" }).click();

  await expect(page.getByRole("region", { name: "Карта вузов" })).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();
  await expect(page.locator(".leaflet-attribution-flag")).toHaveCount(0);

  await page.getByAltText("Университет ИТМО").click();
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
    await openMapView(page);

    await expect(
      page.getByRole("complementary", { name: "Выбранный вуз" }),
    ).toBeHidden();

    await page.getByAltText("Университет ИТМО").click();

    const sheet = page.getByRole("dialog", { name: "Университет ИТМО" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Санкт-Петербург")).toBeVisible();
    await expect(sheet.getByText("Взаимодействия")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });
});
