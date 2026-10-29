import { expect, test, type Page } from "@playwright/test";
import { seed } from "./seed";

test.beforeAll(seed);

// Next keeps Today mounted but hidden after navigating, and it shows the same announcement, so
// match visible text only.
const visible = (page: Page, text: string) => page.getByText(text, { exact: true }).filter({ visible: true });

// Today's "See all" opens the inbox; opening an unread announcement marks it read, and it stays
// read after a reload.
test("opens the inbox from Today and marks an announcement read by opening it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "See all" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Announcements" })).toBeVisible();
  await expect(visible(page, "1 unread")).toBeVisible();

  await page.getByRole("main").getByText("Exam room changed").filter({ visible: true }).click();
  await expect(visible(page, "The exam is now in room 101.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark unread" })).toBeVisible();

  await page.reload();
  await expect(visible(page, "All read.")).toBeVisible();
});
