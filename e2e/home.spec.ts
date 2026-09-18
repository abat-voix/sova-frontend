import { expect, test } from "@playwright/test";

test("shows the SOVA application shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("СОВА");
  await expect(page.getByRole("heading", { name: "СОВА" })).toBeVisible();
  await expect(
    page.getByText("Система организации взаимодействия с академической средой"),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveCSS(
    "font-family",
    /rostelecomBasis/i,
  );
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(244, 244, 245)",
  );
  const themeToggle = page.getByRole("button", { name: "Переключить тему" });
  await expect(themeToggle).toBeVisible();
  await expect(page.locator("html")).toHaveClass(
    /Theme_root_rtk_default_light/,
  );

  await themeToggle.click();
  await expect(page.locator("html")).toHaveClass(/Theme_root_rtk_default_dark/);

  await page
    .getByRole("button", { name: "Переключить язык на английский" })
    .click();
  await expect(
    page.getByText(
      "System for organizing collaboration with the academic community",
    ),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("shows the CRM shell after authentication", async ({ page }) => {
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

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Добро пожаловать, Сова" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Основная навигация" }),
  ).toBeVisible();
  await expect(page.getByAltText("Логотип СОВА")).toHaveAttribute(
    "src",
    /sova\.png/,
  );

  await page
    .getByRole("link", { name: "Договоры", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/contracts$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Договоры" }),
  ).toBeVisible();

  await page.setViewportSize({ height: 844, width: 390 });
  await page.getByRole("button", { name: "Открыть навигацию" }).click();
  await expect(
    page.getByRole("navigation", { name: "Основная навигация" }).last(),
  ).toBeVisible();
});
