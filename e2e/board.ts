import type { Locator, Page } from "@playwright/test";

/** A term's column on a pathway board, found by its heading. */
export function termColumn(page: Page, name: string): Locator {
  return page.getByRole("listitem").filter({ has: page.getByRole("heading", { level: 2, name, exact: true }) });
}

/**
 * Drags a course by the card itself (near its code, away from the grip) onto a term column. The
 * pointer moves in small steps, as a hand would: dnd-kit only starts a drag after the pointer has
 * moved a few pixels, and a press that never moves stays a click.
 */
export async function dragCourse(page: Page, code: string, toTerm: string) {
  // The grip's parent is the draggable card.
  const card = page.getByRole("button", { name: `Move ${code}` }).locator("..");
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  const from = box && { x: box.x + 20, y: box.y + 10, width: 40, height: 20 };
  const column = termColumn(page, toTerm);
  await column.scrollIntoViewIfNeeded();
  const to = await column.boundingBox();
  if (!from || !to) throw new Error(`Can't find ${code} or ${toTerm} on the board.`);

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + Math.min(to.height / 2, 120), { steps: 20 });
  await page.mouse.up();
}
