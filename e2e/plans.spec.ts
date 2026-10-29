import { expect, test } from "@playwright/test";
import { termColumn } from "./board";
import { seed, TERM_NAMES } from "./seed";

test.beforeAll(seed);

// The whole what-if flow: save a copy, try a swap, compare with the current plan, then make the
// plan real and see the swap on the pathway.
test("tries a swap in a what-if plan, compares it, and makes it the plan", async ({ page }) => {
  await page.goto("/pathway/plans");
  await page.getByRole("button", { name: "New plan" }).click();
  await page.getByLabel("Name").fill("Try QA 4000");
  await page.getByRole("button", { name: "Save a copy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Try QA 4000" })).toBeVisible();
  await expect(page.getByText("What-if plan", { exact: true })).toBeVisible();

  await page.getByLabel("Swap", { exact: true }).selectOption({ label: "QA 4000 · Invented Elective, for QA 3100" });
  await page.getByRole("button", { name: "Try it" }).click();
  await expect(termColumn(page, TERM_NAMES.fall27).getByText("Swap for QA 3100")).toBeVisible();

  await page.getByRole("link", { name: "Compare with current" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Compare plans" })).toBeVisible();
  // Next keeps the plan page mounted but hidden (for back and forward), so match visible text only.
  await expect(page.getByText("Swap for QA 3100").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Not in Try QA 4000").filter({ visible: true })).toBeVisible();

  await page.getByRole("link", { name: "Back to Try QA 4000" }).click();
  await page.getByRole("button", { name: "Make active" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Make active" }).click();

  await expect(page).toHaveURL(/\/pathway$/);
  await expect(termColumn(page, TERM_NAMES.fall27).getByText("QA 4000")).toBeVisible();
  await expect(page.getByText("QA 3100").filter({ visible: true })).toHaveCount(0);
});

test("renames and deletes a plan from its menu", async ({ page }) => {
  await page.goto("/pathway/plans");
  await page.getByRole("button", { name: "New plan" }).click();
  await page.getByLabel("Name").fill("Scratch plan");
  await page.getByRole("button", { name: "Save a copy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Scratch plan" })).toBeVisible();

  await page.goto("/pathway/plans");
  await page.getByRole("button", { name: "More for Scratch plan" }).click();
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("Renamed plan");
  await page.getByRole("dialog").getByRole("button", { name: "Rename" }).click();
  await expect(page.getByRole("link", { name: /Renamed plan/ })).toBeVisible();

  await page.getByRole("button", { name: "More for Renamed plan" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete plan" }).click();
  await expect(page.getByRole("link", { name: /Renamed plan/ })).toHaveCount(0);
});
