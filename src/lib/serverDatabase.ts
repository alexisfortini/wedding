import "server-only";
import { createClient } from "@supabase/supabase-js";
import adminDefaults from "@config/ui/admin.json";
import { databaseFetch } from "./databaseFetch";

export class ApiError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}

export function serverDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("placeholder")) throw new ApiError("The database is temporarily unavailable. Please try again later.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: databaseFetch },
  });
}

export type ServerDatabase = ReturnType<typeof serverDatabase>;

export async function readAllRows(db: ServerDatabase, table: string) {
  const rows: any[] = [];
  const orderColumn = table === "site_configs" ? "key" : table === "guest_groups" || table === "guest_events" ? "guest_id" : "id";
  for (let offset = 0; ; offset += 1000) {
    let query = db.from(table).select("*").order(orderColumn);
    if (table === "guest_groups") query = query.order("group_id");
    if (table === "guest_events") query = query.order("event_id");
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw new ApiError("Unable to read all current database records. Please try again.");
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export async function readConfig(db: ServerDatabase, key: string) {
  const { data, error } = await db.from("site_configs").select("value, updated_at").eq("key", key).maybeSingle();
  if (error) throw new ApiError("Unable to load the current website information. Please try again.");
  return data;
}

export async function isAdminRequest(req: Request, db: ServerDatabase) {
  const supplied = req.headers.get("x-admin-passcode");
  if (!supplied) return false;
  const row = await readConfig(db, "admin");
  const expected = row ? row.value?.passcode : adminDefaults.passcode;
  return typeof expected === "string" && expected.length > 0 && supplied === expected;
}

export async function requireAdmin(req: Request, db: ServerDatabase) {
  if (!await isAdminRequest(req, db)) throw new ApiError("Please sign in to the admin portal again.", 401);
}

/** Compare the whole JSON value so simultaneous guest writes cannot erase each other. */
export async function updateConfig(db: ServerDatabase, key: string, fallback: any, change: (value: any) => any) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await readConfig(db, key);
    const next = change(row?.value ?? fallback);
    const payload = { key, value: next, updated_at: new Date().toISOString() };
    if (!row) {
      const { error } = await db.from("site_configs").insert(payload);
      if (!error) return next;
      if (error.code === "23505") continue;
      throw new ApiError("Your change could not be saved. Please try again.");
    }
    const { data, error } = await db.from("site_configs").update(payload)
      .eq("key", key).eq("value", JSON.stringify(row.value)).select("key");
    if (error) throw new ApiError("Your change could not be saved. Please try again.");
    if (data?.length) return next;
  }
  throw new ApiError("Someone updated this at the same time. Please refresh and try again.", 409);
}

export function apiFailure(error: unknown) {
  console.error("Wedding API request failed:", error);
  return Response.json({ success: false, error: error instanceof ApiError ? error.message : "Something went wrong. Please try again." },
    { status: error instanceof ApiError ? error.status : error instanceof SyntaxError ? 400 : 500, headers: { "Cache-Control": "no-store" } });
}
