import { E2E_EMAIL, MAILPIT_URL } from "./local";

const SEARCH = `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${E2E_EMAIL}`)}`;

/** Clears the e2e user's inbox, so the next link found is the one this run asked for. */
export async function clearInbox() {
  await fetch(SEARCH, { method: "DELETE" });
}

/** Waits for the magic-link email and returns the sign-in link in it. */
export async function waitForMagicLink(timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = (await (await fetch(SEARCH)).json()) as { messages?: { ID: string }[] };
    const latest = found.messages?.[0];
    if (latest) {
      const message = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`)).json()) as { HTML?: string; Text?: string };
      const link = /https?:\/\/[^"'\s<>]+\/auth\/v1\/verify[^"'\s<>]*/.exec(message.HTML ?? message.Text ?? "")?.[0];
      if (link) return link.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No magic-link email for ${E2E_EMAIL} within ${timeoutMs / 1000}s.`);
}
