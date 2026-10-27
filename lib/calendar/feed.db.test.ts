import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";
import { readLocalSupabase } from "@/test/local-supabase";
import { feedSchema } from "./ics";
import { generateFeedToken } from "./token";

// These tests call the real calendar_feed() function with the anon key, the way the feed route
// does, so they need the local Supabase stack (`supabase start`); see test/local-supabase.ts.
const local = readLocalSupabase();

// All data is invented, under owners and a term no other DB test uses.
const OWNER = "55555555-5555-4555-8555-555555555555";
const OTHER_OWNER = "66666666-6666-4666-8666-666666666666";
const TERM_ID = 30003;

describe.skipIf(!local)("calendar_feed against the local database", () => {
  // The placeholders are never used: the suite is skipped when `local` is null.
  const admin = createClient<Database>(local?.url ?? "http://127.0.0.1", local?.serviceKey ?? "unused", { auth: { persistSession: false } });
  const anon = createClient<Database>(local?.url ?? "http://127.0.0.1", local?.anonKey ?? "unused", { auth: { persistSession: false } });
  const { token, hash } = generateFeedToken();

  const check = ({ error }: { error: { message: string } | null }) => {
    if (error) throw new Error(error.message);
  };

  async function cleanUp() {
    for (const owner of [OWNER, OTHER_OWNER]) {
      check(await admin.from("calendar_feeds").delete().eq("owner_id", owner));
      check(await admin.from("courses").delete().eq("owner_id", owner));
    }
  }

  beforeAll(async () => {
    await cleanUp();
    check(await admin.from("terms").upsert({ id: TERM_ID, name: "Test term (feed db tests)", kind: "semester", owner_id: OWNER }));
    const { data: courses, error } = await admin
      .from("courses")
      .insert([
        { code: "FEED 1000", title: "Feed One", credits: 4, type: "cs_core", term_id: TERM_ID, owner_id: OWNER },
        { code: "FEED 2000", title: "Someone else's", credits: 4, type: "cs_core", term_id: TERM_ID, owner_id: OTHER_OWNER },
      ])
      .select("id, owner_id");
    if (error) throw new Error(error.message);
    const mine = courses.find((c) => c.owner_id === OWNER)?.id ?? "";
    const theirs = courses.find((c) => c.owner_id === OTHER_OWNER)?.id ?? "";
    const soon = new Date(Date.now() + 86_400_000).toISOString();
    const later = new Date(Date.now() + 90_000_000).toISOString();

    check(
      await admin.from("class_sessions").insert([
        { ics_uid: "feed-mine", course_id: mine, kind: "lecture", title: "x", starts_at: soon, ends_at: later, owner_id: OWNER },
        { ics_uid: "feed-theirs", course_id: theirs, kind: "lecture", title: "x", starts_at: soon, ends_at: later, owner_id: OTHER_OWNER },
      ]),
    );
    check(
      await admin.from("assignments").insert({
        canvas_id: 9_000_100_001, course_id: mine, title: "Feed PS", kind: "assignment", due_at: soon, html_url: "https://canvas.example.edu/a", owner_id: OWNER,
      }),
    );
    check(await admin.from("calendar_feeds").insert({ token_hash: hash, owner_id: OWNER }));
  });

  afterAll(async () => {
    await cleanUp();
    check(await admin.from("terms").delete().eq("id", TERM_ID));
  });

  it("returns the token owner's classes and deadlines, and nobody else's", async () => {
    const { data, error } = await anon.rpc("calendar_feed", { p_token: token });
    expect(error).toBeNull();
    const feed = feedSchema.parse(data);
    expect(feed.sessions.map((s) => s.course_code)).toEqual(["FEED 1000"]);
    expect(feed.assignments.map((a) => a.title)).toEqual(["Feed PS"]);
  });

  it("returns null for an unknown or malformed token", async () => {
    expect((await anon.rpc("calendar_feed", { p_token: generateFeedToken().token })).data).toBeNull();
    expect((await anon.rpc("calendar_feed", { p_token: "short" })).data).toBeNull();
    expect((await anon.rpc("calendar_feed", { p_token: hash })).data).toBeNull(); // the hash is not the token
  });

  it("does not let anon read the feeds table directly", async () => {
    const { data } = await anon.from("calendar_feeds").select("token_hash");
    expect(data).toEqual([]);
  });
});
