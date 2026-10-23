import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · College Hub" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>College Hub</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send you a sign-in link.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error === "link" && (
            <p role="alert" className="text-sm text-destructive">
              That sign-in link is invalid or has expired. Request a new one below.
            </p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
