import { expect, test, type Page } from "@playwright/test";
import { seed } from "./seed";

test.beforeAll(seed);

// The shortcut listener attaches on hydration, which can land after the page loads on a cold
// server, so press it until the palette opens.
async function openPalette(page: Page) {
  const input = page.getByRole("combobox", { name: /Search courses/ });
  await expect(async () => {
    if (!(await input.isVisible())) await page.keyboard.press("ControlOrMeta+k");
    await expect(input).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return input;
}

test("finds a course and an assignment with ⌘K and opens them", async ({ page }) => {
  await page.goto("/");

  const input = await openPalette(page);
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

test("adds a to-do from ⌘K", async ({ page }) => {
  await page.goto("/");
  const input = await openPalette(page);
  await input.fill("to-do");
  await expect(page.getByRole("option", { name: "Add a to-do…" })).toBeVisible();
  await input.press("Enter");

  const title = page.getByRole("textbox", { name: "To-do" });
  await title.fill("Order lab goggles");
  await title.press("Enter");
  await expect(page.getByRole("status").getByText("Added “Order lab goggles”")).toBeVisible();
  await expect(page.getByRole("list").getByText("Order lab goggles").filter({ visible: true })).toBeVisible();
});

test("starts a new what-if plan from ⌘K", async ({ page }) => {
  await page.goto("/");
  const input = await openPalette(page);
  await input.fill("what-if");
  // Actions come first, so Enter runs it rather than opening the plans page.
  await input.press("Enter");
  await expect(page).toHaveURL(/\/pathway\/plans\?new/);
  await expect(page.getByRole("dialog", { name: "New plan" })).toBeVisible();
});

