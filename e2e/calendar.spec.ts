import { expect, test } from "@playwright/test";

test("moves through the calendar with the keyboard", async ({ page }) => {
  await page.goto("/calendar?view=month&date=2026-10-15");
  await expect(page.getByRole("heading", { name: "October 2026", level: 1 })).toBeVisible();

  // The shortcuts attach on hydration, so press until the page answers.
  await expect(async () => {
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { name: "November 2026", level: 1 })).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(page).toHaveURL(/view=month&date=2026-11-01/);

  await page.keyboard.press("w");
  await expect(page).toHaveURL(/view=week&date=2026-11-01/);
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(/view=week&date=2026-10-19/);
  await page.keyboard.press("m");
  await expect(page).toHaveURL(/view=month&date=2026-10-19/);
});
