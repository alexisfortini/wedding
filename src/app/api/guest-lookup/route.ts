import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { databaseFetch } from "@/lib/databaseFetch";
import { matchGuestNames } from "@/lib/guestNames";

const lookupSchema = z.union([
  z.object({ firstName: z.string().trim().min(1).max(100), lastName: z.string().trim().min(1).max(100) }),
  // PostgreSQL accepts UUID-shaped IDs regardless of RFC version/variant bits.
  // Existing guest records include older deterministic IDs with those bits unset.
  z.object({ id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) }),
]);
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  try {
    const parsed = lookupSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Please enter both your first and last name." }, { status: 400, headers });
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("DATABASE_CONFIGURATION_MISSING");
    // Use the same anonymous permissions as the guest website. Never bypass RLS for sign-in.
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: databaseFetch },
    });
    let id: string | undefined;
    if ("id" in parsed.data) id = parsed.data.id;
    else {
      const { firstName, lastName } = parsed.data;
      // Only names and IDs are read for matching; the invitation list stays on the server.
      const names: { id: string; first_name: string; last_name: string }[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await db.from("guests").select("id,first_name,last_name")
          .order("id").range(offset, offset + 999).abortSignal(request.signal);
        if (error) throw new Error(error.code || "DATABASE_UNAVAILABLE");
        names.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      const matches = matchGuestNames(names, firstName, lastName);
      if (matches.length > 1) return Response.json({ error: "More than one invitation matches. Please contact the hosts for help." }, { status: 409, headers });
      id = matches[0]?.id;
    }
    if (!id) return Response.json({ guest: null }, { headers });
    // Avoid requiring an unrelated parties relationship for invitation sign-in.
    const { data, error } = await db.from("guests").select("*").eq("id", id).abortSignal(request.signal).maybeSingle();
    if (error) throw new Error(error.code || "DATABASE_UNAVAILABLE");
    return Response.json({ guest: data }, { headers });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Please check your invitation details." }, { status: 400, headers });
    console.error("Guest lookup unavailable:", error instanceof Error ? error.message : "DATABASE_UNAVAILABLE");
    return Response.json({ error: "The invitation service is temporarily unavailable. Your details have not been changed. Please retry or contact the hosts." }, { status: 503, headers });
  }
}
