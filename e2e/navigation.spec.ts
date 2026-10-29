import { expect, test } from "@playwright/test";
import { seed } from "./seed";

test.beforeAll(seed);

// The four places, the Courses index and the Plan section's own control (see the 2026-10-29
// navigation decision). The tests run at desktop width, where the places are in the header.
test("goes from Today to a course through Courses, and back up", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("navigation", { name: "Main" });
  await main.getByRole("link", { name: "Courses" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Courses" })).toBeVisible();
  await expect(main.getByRole("link", { name: "Courses" })).toHaveAttribute("aria-current", "page");
  // The seeded course's card shows its grade (80% on the graded problem sets).
  const card = page.getByRole("link", { name: /QA 2000.*Browser Automation/ });
  await expect(card).toContainText("80.0%");
  await card.click();

  await expect(page.getByRole("heading", { level: 1, name: "Browser Automation" })).toBeVisible();
  // A course page counts as part of Courses, and links back up to it.
  await expect(main.getByRole("link", { name: "Courses" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("main").getByRole("link", { name: "Courses" }).click();
  await expect(page).toHaveURL(/\/courses$/);
});

test("moves between the Plan section's pages", async ({ page }) => {
  await page.goto("/pathway");
  const plan = page.getByRole("navigation", { name: "Plan" });
  await expect(plan.getByRole("link", { name: "Pathway" })).toHaveAttribute("aria-current", "page");

  await plan.getByRole("link", { name: "Requirements" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Requirements" })).toBeVisible();
  await expect(plan.getByRole("link", { name: "Requirements" })).toHaveAttribute("aria-current", "page");
  // Still inside Plan in the main nav.
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");
});
