import { expect, test } from "@playwright/test";

test("keeps a chosen theme across page loads, and goes back to the system's", async ({ page }) => {
  await page.goto("/settings");
  const html = page.locator("html");

  await page.getByRole("button", { name: "Dark" }).click();
  await expect(html).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(page.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "System" }).click();
  await expect(html).not.toHaveClass(/\bdark\b/);
});
