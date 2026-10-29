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

  // The toast offers Undo, which brings it back.
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(done).toBeVisible();
});

// Deleting doesn't ask first; Undo in the toast puts the same to-do back, and it survives a reload.
test("deletes a to-do and undoes it", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("New to-do").fill("Return the library book");
  await page.getByRole("button", { name: "Add to-do" }).click();
  await expect(page.getByText("Return the library book")).toBeVisible();

  await page.getByRole("button", { name: "Delete “Return the library book”" }).click();
  await expect(page.getByText("Return the library book", { exact: true })).toHaveCount(0);
  await page.getByRole("status").getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Return the library book", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Return the library book", { exact: true })).toBeVisible();
});
