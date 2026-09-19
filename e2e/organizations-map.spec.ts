import { expect, test } from "@playwright/test";

test("switches organizations from the list to the university map", async ({
  page,
}) => {
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
});
