"use client";

import { useActionState, useId, useState } from "react";
import { createCalendarFeed, type FeedLinkState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const IDLE: FeedLinkState = { status: "idle", url: null, message: "" };

// The link exists only in this component's state after it is created: the database keeps a hash.
export function CalendarFeed({ createdOn }: { createdOn: string | null }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(createCalendarFeed, IDLE);
  const [copied, setCopied] = useState(false);

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-3">
      {state.url ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={id}>Your feed link (shown once)</Label>
          <div className="flex gap-2">
            <Input id={id} readOnly value={state.url} onFocus={(event) => event.currentTarget.select()} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => copy(state.url ?? "")}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            On an iPhone: Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar, then paste it.
            Anyone with this link can see your timetable and deadlines, so keep it private.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {createdOn
            ? `A feed link was created on ${createdOn}. It was shown once; make a new one to see a link again (the old one stops working).`
            : "Subscribe to your classes, exams and deadlines from your phone's calendar app."}
        </p>
      )}
      <form action={formAction}>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Creating…" : createdOn || state.url ? "Make a new link" : "Create feed link"}
        </Button>
      </form>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </div>
  );
}
