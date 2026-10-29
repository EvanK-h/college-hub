import { expect, test } from "@playwright/test";
import { termColumn } from "./board";
import { seed, TERM_NAMES } from "./seed";

test.beforeAll(seed);

// "Try in a what-if plan" makes a plan with the swap taken in, and opens that plan the next time.
test("tries a swap from the swaps page in its own what-if plan", async ({ page }) => {
  await page.goto("/pathway/swaps");
  await page.getByText("QA 4000").click();
  await page.getByRole("button", { name: "Try in a what-if plan" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Try QA 4000" })).toBeVisible();
  await expect(termColumn(page, TERM_NAMES.fall27).getByText("Swap for QA 3100")).toBeVisible();
  const planUrl = page.url();

  await page.goto("/pathway/swaps");
  await page.getByText("QA 4000").click();
  await page.getByRole("button", { name: "Try in a what-if plan" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Try QA 4000" })).toBeVisible();
  expect(page.url()).toBe(planUrl);
});
