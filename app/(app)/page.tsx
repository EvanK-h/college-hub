import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PAGE_CLASS, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default function HomePage() {
  return (
    <main className={PAGE_CLASS}>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Greeting />
      </Suspense>
    </main>
  );
}

async function Greeting() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  // The proxy already redirects signed-out visitors; this is a second check in case it is ever bypassed.
  if (!data?.claims) redirect("/login");

  return (
    <PageHeader title="Hello, Evan" description={data.claims.email ? `Signed in as ${data.claims.email}` : undefined}>
      <form action={signOut} className="mt-2">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </PageHeader>
  );
}
