import { expect, test } from "@playwright/test";
import { seed } from "./seed";

test.beforeAll(seed);

test("finds a course and an assignment with ⌘K and opens them", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("ControlOrMeta+k");
  const input = page.getByRole("combobox", { name: /Search courses/ });
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
