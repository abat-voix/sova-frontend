import { expect, test } from "@playwright/test";

test("shows the SOVA application shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("СОВА");
  await expect(page.getByRole("heading", { name: "СОВА" })).toBeVisible();
  await expect(
    page.getByText("Система организации взаимодействия с академической средой"),
  ).toBeVisible();
  const themeToggle = page.getByRole("button", { name: "Переключить тему" });
  await expect(themeToggle).toBeVisible();

  await themeToggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
