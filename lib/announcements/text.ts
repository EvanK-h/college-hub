// Canvas sends announcements as HTML written by staff. Rendering it as HTML would let any markup
// in it run in this site (cross-site scripting), so the site shows plain text instead, which React
// escapes. The Canvas link is there for images, tables and formatting.

const BLOCK_END = /<\/(p|div|li|h[1-6]|tr|blockquote|pre)>|<br\s*\/?>/gi;
const LIST_ITEM = /<li[^>]*>/gi;
const DROPPED_BLOCKS = /<(script|style|head|template)[^>]*>[\s\S]*?<\/\1>/gi;
const TAG = /<[^>]*>/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#")) {
      const code = body[1]?.toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

/** Announcement HTML as plain text: paragraphs kept as blank-line breaks, list items as bullets. */
export function htmlToText(html: string | null): string {
  if (!html) return "";
  const text = html
    .replace(DROPPED_BLOCKS, "")
    .replace(LIST_ITEM, "• ")
    .replace(BLOCK_END, "\n")
    .replace(TAG, "");
  return decodeEntities(text)
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The first `length` characters of the text, cut at a word, for previews. */
export function excerpt(html: string | null, length = 160): string {
  const text = htmlToText(html).replace(/\s+/g, " ");
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), length - 20)).trimEnd()}…`;
}
