import { expect, test } from "@playwright/test";
import { dragCourse, termColumn } from "./board";
import { seed, TERM_NAMES } from "./seed";

test.beforeAll(seed);

test("moves a course to another term and keeps it there", async ({ page }) => {
  await page.goto("/pathway");
  await expect(termColumn(page, TERM_NAMES.fall27).getByText("QA 3100")).toBeVisible();

  await dragCourse(page, "QA 3100", TERM_NAMES.spring27);
  await expect(termColumn(page, TERM_NAMES.spring27).getByText("QA 3100")).toBeVisible();

  await page.reload();
  await expect(termColumn(page, TERM_NAMES.spring27).getByText("QA 3100")).toBeVisible();
  await expect(termColumn(page, TERM_NAMES.fall27).getByText("QA 3100")).toHaveCount(0);
});

test("asks before a move that breaks a prerequisite, and can be cancelled", async ({ page }) => {
  await page.goto("/pathway");

  // QA 2100 needs QA 2000 in an earlier term; Fall 2026 is QA 2000's own term.
  await dragCourse(page, "QA 2100", TERM_NAMES.fall26);
  const dialog = page.getByRole("dialog", { name: `Move QA 2100 to ${TERM_NAMES.fall26}?` });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Needs QA 2000 in an earlier term.")).toBeVisible();

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(termColumn(page, TERM_NAMES.spring27).getByText("QA 2100")).toBeVisible();
});
