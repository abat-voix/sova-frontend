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

const contacts = [
  {
    id: "c1",
    full_name: "Анна Иванова",
    position: "Проректор",
    email: "anna@example.com",
    phone: "+7 900 000-00-01",
    is_active: true,
    university: { id: "u1", name: "Тюменский университет" },
    b2c_client: null,
    created_at: "2026-09-01T10:00:00+03:00",
    updated_at: "2026-09-02T10:00:00+03:00",
  },
  {
    id: "c2",
    full_name: "Борис Петров",
    position: "",
    email: "",
    phone: "",
    is_active: false,
    university: null,
    b2c_client: { id: "b1", full_name: "ООО «Ромашка»", kind: "legal_entity" },
    created_at: "2026-09-03T10:00:00+03:00",
    updated_at: "2026-09-03T10:00:00+03:00",
  },
];

/** Каталог контактов: отбор, поиск и порядок считает мок, как это делает API. */
async function mockContactPersons(page: Page) {
  await page.route("**/api/catalog/contact-persons/**", async (route) => {
    const url = new URL(route.request().url());
    const id = url.pathname.match(/\/contact-persons\/([^/]+)\/$/)?.[1];

    if (id) {
      await route.fulfill({
        contentType: "application/json",
        json: contacts.find((contact) => contact.id === id),
      });
      return;
    }

    const isActive = url.searchParams.get("is_active");
    const search = url.searchParams.get("search")?.toLocaleLowerCase("ru");
    const ordering = url.searchParams.get("ordering");

    let results = contacts;

    if (isActive !== null) {
      results = results.filter(
        (contact) => contact.is_active === (isActive === "true"),
      );
    }

    if (search) {
      results = results.filter((contact) =>
        contact.full_name.toLocaleLowerCase("ru").includes(search),
      );
    }

    if (ordering === "full_name" || ordering === "-full_name") {
      const direction = ordering.startsWith("-") ? -1 : 1;
      results = [...results].sort(
        (a, b) => direction * a.full_name.localeCompare(b.full_name, "ru"),
      );
    }

    await route.fulfill({
      contentType: "application/json",
      json: { count: results.length, next: null, previous: null, results },
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockAuthenticatedUser(page);
  await mockContactPersons(page);
});

test.describe("Contacts", () => {
  test("shows the catalog table and opens a contact in the drawer", async ({
    page,
  }) => {
    await page.goto("/contacts");

    await expect(
      page.getByRole("heading", { level: 1, name: "Контакты" }),
    ).toBeVisible();

    const table = page.getByRole("table", { name: "Контактные лица" });
    await expect(table.getByRole("row")).toHaveCount(3);
    await expect(table.getByText("Тюменский университет")).toBeVisible();
    await expect(table.getByText("ООО «Ромашка»")).toBeVisible();
    await expect(page.getByText("Строки 1–2 из 2")).toBeVisible();

    await table.getByText("Анна Иванова").click();

    const drawer = page.getByRole("dialog");
    await expect(
      drawer.getByRole("heading", { name: "Анна Иванова" }),
    ).toBeVisible();
    await expect(drawer.getByText("anna@example.com")).toBeVisible();
    await expect(drawer.getByText("Дата создания")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("reverses the order when the sorted header is clicked again", async ({
    page,
  }) => {
    await page.goto("/contacts");

    const rows = page
      .getByRole("table", { name: "Контактные лица" })
      .getByRole("row");
    await expect(rows.nth(1)).toContainText("Анна Иванова");

    await page.getByRole("button", { name: /ФИО/ }).click();

    await expect(rows.nth(1)).toContainText("Борис Петров");
  });

  test("keeps only the active contacts when the filter is applied", async ({
    page,
  }) => {
    await page.goto("/contacts");

    const table = page.getByRole("table", { name: "Контактные лица" });
    await expect(table.getByText("Борис Петров")).toBeVisible();

    await page.getByRole("button", { exact: true, name: "Активные" }).click();

    await expect(table.getByText("Борис Петров")).toBeHidden();
    await expect(table.getByText("Анна Иванова")).toBeVisible();
  });
});
