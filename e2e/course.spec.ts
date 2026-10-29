import { expect, test } from "@playwright/test";
import { seed } from "./seed";

test.beforeAll(seed);

// The seeded course stands at 80% (problem sets, 60% of the grade, at 80/100) with the exam
// (40%) still to come, so the calculator's answers are known in advance.
test("shows the weighted grade and what the exam needs for a target", async ({ page }) => {
  await page.goto("/courses/qa-2000");
  await expect(page.getByRole("heading", { level: 1, name: "Browser Automation" })).toBeVisible();
  await expect(page.getByText("80.0%", { exact: true })).toBeVisible();

  const target = page.getByRole("group", { name: "Target grade" });
  await expect(page.getByText("Out of reach: full marks on everything left ends at 88.0%.")).toBeVisible();

  await target.getByText("B−", { exact: true }).click();
  await expect(target.getByRole("radio", { name: "B−" })).toBeChecked();
  await expect(page.getByText("For B− (80%), average 80.0% on the work still to be graded.")).toBeVisible();
});

// Notes have no Save button: they save after a pause in typing and are there after a reload.
test("saves notes on its own", async ({ page }) => {
  await page.goto("/courses/qa-2000");
  const notes = page.getByRole("textbox", { name: "Notes" });
  await notes.fill("Office hours Tuesday 3pm");
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "Notes" })).toHaveValue("Office hours Tuesday 3pm");
});

// The status pill is the progress control: the choice shows at once and is saved.
test("sets an assignment's progress from its status pill", async ({ page }) => {
  await page.goto("/courses/qa-2000");
  await page.getByRole("button", { name: "Progress: Not started. Change" }).click();
  await page.getByRole("menuitemradio", { name: "In progress" }).click();
  await expect(page.getByRole("button", { name: "Progress: In progress. Change" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Progress: In progress. Change" }).click();
  await expect(page.getByRole("menuitemradio", { name: "In progress" })).toBeChecked();
});
