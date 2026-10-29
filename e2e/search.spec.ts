import { expect, test } from "@playwright/test";
import { seed } from "./seed";

test.beforeAll(seed);

test("finds a course and an assignment with ⌘K and opens them", async ({ page }) => {
  await page.goto("/");

  // The shortcut listener attaches on hydration, which can land after the page loads on a cold
  // server, so press it until the palette opens.
  const input = page.getByRole("combobox", { name: /Search courses/ });
  await expect(async () => {
    if (!(await input.isVisible())) await page.keyboard.press("ControlOrMeta+k");
    await expect(input).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await input.fill("flaky");
  await expect(page.getByRole("option", { name: /QA 2100 · Flaky Test Forensics/ })).toBeVisible();
  await input.press("Enter");
  await expect(page).toHaveURL(/\/courses\/qa-2100$/);

  await page.getByRole("button", { name: "Search" }).click();
  await input.fill("final exam");
  await expect(page.getByRole("option", { name: /Final Exam/ })).toBeVisible();
  await input.press("Enter");
  await expect(page).toHaveURL(/\/courses\/qa-2000#assignments-heading$/);
});
