import { NextResponse } from "next/server";
import { apiFailure, ApiError, requireAdmin, serverDatabase } from "@/lib/serverDatabase";

export async function POST(req: Request) {
  try {
    const { action, key, value, keys, expectedRevision } = await req.json();

    const supabase = serverDatabase();
    await requireAdmin(req, supabase);


    if (action === "delete") {
      if (!keys || !Array.isArray(keys)) {
        return NextResponse.json({ success: false, error: "Missing keys array for delete" }, { status: 400 });
      }
      const { error } = await supabase.from("site_configs").delete().in("key", keys);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Default action: upsert
    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: "Missing key or value" }, { status: 400 });
    }

    // A settings page opened before a guest report must not erase that report.
    if (key === "registry") {
      if (typeof expectedRevision !== "string" && expectedRevision !== null) throw new ApiError("Reload registry settings before saving.", 409);
      const revision = new Date().toISOString();
      const payload = { key, value, updated_at: revision };
      const result = expectedRevision === null
        ? await supabase.from("site_configs").insert(payload).select("key")
        : await supabase.from("site_configs").update(payload).eq("key", key).eq("updated_at", expectedRevision).select("key");
      if (result.error?.code === "23505" || (!result.error && !result.data?.length)) throw new ApiError("The registry changed while you were editing. Reload settings before saving so new gift reports are preserved.", 409);
      if (result.error) throw result.error;
      return NextResponse.json({ success: true, revision });
    }

    const { error } = await supabase.from("site_configs").upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to execute site config API:", err);
    return apiFailure(err);
  }
}
