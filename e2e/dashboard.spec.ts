import { expect, test } from "@playwright/test";
import { seed } from "./seed";

test.beforeAll(seed);

test("adds a to-do and ticks it off", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Nothing to do.")).toBeVisible();

  await page.getByLabel("New to-do").fill("Revise for the QA 2000 exam");
  await page.getByLabel("Course").selectOption({ label: "QA 2000" });
  await page.getByRole("button", { name: "Add to-do" }).click();

  const done = page.getByRole("button", { name: "Mark “Revise for the QA 2000 exam” done" });
  await expect(done).toBeVisible();
  await expect(page.getByText("QA 2000", { exact: false }).first()).toBeVisible();

  await done.click();
  await expect(page.getByText("Nothing to do.")).toBeVisible();
});
