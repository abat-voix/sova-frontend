import { expect, test, type Locator } from "@playwright/test";

async function getRowColors(row: Locator) {
  return row.evaluate((element) => {
    const text = element.querySelector<HTMLElement>(".gantt_tree_content");

    if (!text) throw new Error("Task label was not rendered");

    function rgbChannels(color: string) {
      const channels = color
        .match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number);
      if (!channels || channels.length !== 3) {
        throw new Error(`Unsupported color: ${color}`);
      }
      return channels;
    }

    function luminance(color: string) {
      const channels = rgbChannels(color).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });

      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    const background = getComputedStyle(element).backgroundColor;
    const foreground = getComputedStyle(text).color;
    const lighter = Math.max(luminance(background), luminance(foreground));
    const darker = Math.min(luminance(background), luminance(foreground));

    return {
      background,
      contrast: (lighter + 0.05) / (darker + 0.05),
      foreground,
    };
  });
}

test("uses the dark surface across the whole Gantt chart", async ({ page }) => {
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

  await page.goto("/interactions");
  await expect(page.locator(".gantt_container")).toBeVisible();

  await page.getByRole("button", { name: "Переключить тему" }).click();
  await expect(page.locator("html")).toHaveClass(/Theme_root_rtk_default_dark/);

  const whiteSurfaces = await page
    .locator(".gantt_container *")
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const styles = getComputedStyle(element);

        if (
          styles.backgroundColor !== "rgb(255, 255, 255)" ||
          rect.width < 40 ||
          rect.height < 20
        ) {
          return [];
        }

        return [
          {
            className: element.className.toString(),
            height: Math.round(rect.height),
            width: Math.round(rect.width),
          },
        ];
      }),
    );

  expect(whiteSurfaces).toEqual([]);

  const taskRow = page
    .locator(".gantt_grid_data .gantt_row")
    .filter({ hasText: "Подготовка и контакт" });
  await taskRow.click();
  await expect(taskRow).toHaveClass(/gantt_selected/);

  const selectedRowColors = await getRowColors(taskRow);

  expect(
    selectedRowColors.contrast,
    `Selected row colors: ${JSON.stringify(selectedRowColors)}`,
  ).toBeGreaterThanOrEqual(4.5);

  const hoverRow = page
    .locator(".gantt_grid_data .gantt_row")
    .filter({ hasText: "Согласование и документы" });
  await hoverRow.hover();

  const hoverThemeColors = await hoverRow.evaluate((row) => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = "var(--dhx-gantt-base-colors-hover-color)";
    row.append(probe);
    const dhtmlx = getComputedStyle(probe).backgroundColor;

    probe.style.backgroundColor = "var(--atmr-background-accent-soft)";
    const application = getComputedStyle(probe).backgroundColor;
    probe.remove();

    return { application, dhtmlx };
  });

  expect(hoverThemeColors.dhtmlx).toBe(hoverThemeColors.application);

  const hoveredRowColors = await getRowColors(hoverRow);
  expect(
    hoveredRowColors.contrast,
    `Hovered row colors: ${JSON.stringify(hoveredRowColors)}`,
  ).toBeGreaterThanOrEqual(4.5);
});
