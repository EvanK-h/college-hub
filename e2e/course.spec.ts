import { expect, test } from "@playwright/test";
import { seed } from "./seed";

test.beforeAll(seed);

// The seeded course stands at 80% (problem sets, 60% of the grade, at 80/100) with the exam
// (40%) still to come, so the calculator's answers are known in advance.
test("shows the weighted grade and what the exam needs for a target", async ({ page }) => {
  await page.goto("/courses/qa-2000");
  await expect(page.getByRole("heading", { level: 1, name: "Browser Automation" })).toBeVisible();
  await expect(page.getByText("80.0%", { exact: true })).toBeVisible();

  const target = page.getByLabel("Target grade");
  await expect(page.getByText("Out of reach: full marks on everything left ends at 88.0%.")).toBeVisible();

  await target.selectOption("80");
  await expect(page.getByText("Average 80.0% on the work still to be graded.")).toBeVisible();
});
