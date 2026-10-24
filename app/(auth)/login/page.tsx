import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · College Hub" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>College Hub</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send you a sign-in link.</CardDescription>
        </CardHeader>
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
