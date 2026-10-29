"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle", message: "" };
// How long before the link can be sent again, so a double tap doesn't send two emails.
const RESEND_AFTER_S = 30;

// Once a link is sent, the form gives way to a "Check your email" state with the address, a
// resend button that counts down, and a way back to change the address. The wording never says
// whether the address may sign in (see SENT_MESSAGE in the action).
export function LoginForm() {
  const [state, formAction, pending] = useActionState(requestMagicLink, initialState);
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [wait, setWait] = useState(0);
  const sentAt = useRef(state);

  // Each new "sent" answer starts the resend countdown.
  useEffect(() => {
    if (state.status !== "sent" || sentAt.current === state) return;
    sentAt.current = state;
    setEditing(false);
    setWait(RESEND_AFTER_S);
  }, [state]);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  if (state.status === "sent" && !editing) {
    return (
      <form action={formAction} className="flex flex-col items-center gap-4 text-center">
        <input type="hidden" name="email" value={email} />
        <span className="flex size-12 items-center justify-center rounded-full bg-fill-tertiary">
          <MailCheck aria-hidden className="size-6 text-muted-foreground" />
        </span>
        <div role="status" className="flex flex-col gap-1">
          <p className="text-headline">Check your email</p>
          <p className="text-sm text-muted-foreground">
            If <span className="font-medium break-all text-foreground">{email}</span> can sign in, a link is on its way.
          </p>
        </div>
        <Button type="submit" variant="outline" className="w-full" disabled={pending || wait > 0}>
          {pending ? "Sending…" : wait > 0 ? `Send again in ${wait} s` : "Send again"}
        </Button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Sending…" : "Send sign-in link"}
      </Button>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
