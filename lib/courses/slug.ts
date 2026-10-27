// Course pages live at /courses/cs-2100: lower case, hyphen for the space, so the URL needs no escaping.

export function courseSlug(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, "-");
}

/** "cs-2100" → "CS 2100"; null for anything that isn't a course code, so the page can 404. */
export function codeFromSlug(slug: string): string | null {
  const match = /^([a-z]{2,4})-(\d{4})$/i.exec(slug);
  return match?.[1] && match[2] ? `${match[1].toUpperCase()} ${match[2]}` : null;
}

export function coursePath(code: string): string {
  return `/courses/${courseSlug(code)}`;
}
