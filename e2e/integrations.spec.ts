import { expect, test } from "@playwright/test";

test("administrator configures and reopens an integration mapping", async ({
  page,
}) => {
  await page.goto("/settings/integrations");
  await expect(page.getByRole("heading", { name: "Интеграции" })).toBeVisible();
  await page.getByRole("link", { name: "Создать mapping" }).click();
  await expect(page).toHaveURL(/\/settings\/integrations\/new$/);
  await page.getByLabel("Название").fill("Зачисление студента из LMS");
  await page.getByLabel("Система").selectOption("lms");
  await page.getByLabel("event_type").fill("student.enrolled");
  await page
    .getByLabel("Пример payload")
    .fill(
      JSON.stringify(
        { student: { id: "123", email: "student@example.test" } },
        null,
        2,
      ),
    );
  await page.getByLabel("Сущность CRM").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Добавить правило" }).click();
  await page.getByLabel("Поле внешней системы").selectOption("$.student.email");
  await page.getByLabel("Поле CRM").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Проверить" }).click();
  await expect(page.getByTestId("mapping-preview")).toBeVisible();
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page).toHaveURL(/\/settings\/integrations$/);
  await page
    .getByRole("button", { name: /Открыть Зачисление студента/ })
    .click();
  await expect(page.getByLabel("Поле внешней системы")).toHaveValue(
    "$.student.email",
  );
});
