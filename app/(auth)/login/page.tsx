import { Suspense } from "react";
import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · College Hub" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-[1.1rem] bg-brand text-brand-foreground shadow-raised">
          <GraduationCap aria-hidden className="size-8" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-large-title">College Hub</h1>
          <p className="text-base text-muted-foreground">Enter your email and we&apos;ll send you a sign-in link.</p>
        </div>
      </header>
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4">
          <Suspense>
            <LinkError searchParams={searchParams} />
          </Suspense>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}

// Reading searchParams is request-time data, so it lives in its own component behind Suspense.
async function LinkError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (error !== "link") return null;

  return (
    <p role="alert" className="text-sm text-destructive">
      That sign-in link is invalid or has expired. Request a new one below.
    </p>
  );
}
