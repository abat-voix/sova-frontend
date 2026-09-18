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
