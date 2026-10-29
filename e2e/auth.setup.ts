import { expect, test as setup } from "@playwright/test";
import { E2E_EMAIL } from "./local";
import { clearInbox, waitForMagicLink } from "./mail";
import { seed } from "./seed";

// The sign-in flow, end to end: a signed-out visit is sent to /login, the form sends a magic
// link, and following the link from the email (read from local Mailpit) lands on the dashboard.
// The session is saved for every other test.
setup("signs in with a magic link", async ({ page }) => {
  await seed();
  await clearInbox();

  await page.goto("/pathway");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(page.getByRole("status")).toContainText("a link is on its way");

  await page.goto(await waitForMagicLink());
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();

  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
