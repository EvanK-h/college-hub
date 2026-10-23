"use server";

import { headers } from "next/headers";
import { isAllowedEmail, loginSchema } from "@/lib/auth/email";
import { getServerEnv } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message: string;
};

// Same reply whether or not the address is allowed, so the form never confirms which email may sign in.
const SENT_MESSAGE = "If that address is allowed to sign in, a link is on its way. Check your inbox.";

export async function requestMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const { ALLOWED_EMAIL } = getServerEnv();
  if (!isAllowedEmail(parsed.data.email, ALLOWED_EMAIL)) {
    return { status: "sent", message: SENT_MESSAGE };
  }

  const origin = (await headers()).get("origin");
  if (!origin) {
    return { status: "error", message: "Could not work out the site address. Reload the page and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      // Sign-ups are off, so this only works for a user that already exists.
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) {
    return { status: "error", message: "Could not send the link. Try again in a minute." };
  }

  return { status: "sent", message: SENT_MESSAGE };
}
