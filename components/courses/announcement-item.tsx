"use client";

import { useOptimistic, useTransition, type ReactNode } from "react";
import { Star } from "lucide-react";
import { setAnnouncementFlag } from "@/app/(app)/courses/[code]/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Flags = { read: boolean; important: boolean };

const form = (id: string, flag: keyof Flags, value: boolean) => {
  const data = new FormData();
  data.set("announcementId", id);
  data.set("flag", flag);
  data.set("value", String(value));
  return data;
};

// One announcement as a native <details>. Opening an unread one marks it read, as opening a mail
// does; "Mark unread" sits right under it to take that back. The flags change at once and the
// server catches up. `body` is the text, already converted from Canvas's HTML.
export function AnnouncementItem({
  id,
  title,
  meta,
  body,
  url,
  read,
  important,
  badge,
}: {
  id: string;
  title: string;
  meta: string;
  body: string;
  url: string;
  read: boolean;
  important: boolean;
  /** Shown before the title, such as the course code in the inbox. */
  badge?: ReactNode;
}) {
  const [flags, setFlags] = useOptimistic<Flags, Partial<Flags>>({ read, important }, (current, change) => ({ ...current, ...change }));
  const [, startTransition] = useTransition();

  function set(flag: keyof Flags, value: boolean) {
    startTransition(async () => {
      setFlags({ [flag]: value });
      await setAnnouncementFlag(form(id, flag, value));
    });
  }

  return (
    <details className="group" onToggle={(event) => event.currentTarget.open && !flags.read && set("read", true)}>
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-lg [&::-webkit-details-marker]:hidden">
        <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", flags.read ? "bg-transparent" : "bg-muted-foreground")} />
        <span className="min-w-0 flex-1">
          <span className={cn("block", flags.read ? "font-normal" : "font-semibold")}>
            {badge && <span className="mr-2 align-[0.0625rem]">{badge}</span>}
            {title}
            {!flags.read && <span className="sr-only"> (unread)</span>}
          </span>
          <span className="mt-0.5 block text-xs text-tertiary-foreground">{meta}</span>
        </span>
        {flags.important && <Star aria-label="Important" className="mt-0.5 size-4 fill-current text-muted-foreground" />}
      </summary>
      <div className="mt-3 flex flex-col gap-3 pl-5">
        <p className="text-sm leading-relaxed whitespace-pre-line">{body || "No text."}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => set("read", !flags.read)}>
            {flags.read ? "Mark unread" : "Mark read"}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => set("important", !flags.important)}>
            {flags.important ? "Not important" : "Mark important"}
          </Button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">
            Open in Canvas
          </a>
        </div>
      </div>
    </details>
  );
}
