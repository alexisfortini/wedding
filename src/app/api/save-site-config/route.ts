import { NextResponse } from "next/server";
import { apiFailure, requireAdmin, serverDatabase } from "@/lib/serverDatabase";

export async function POST(req: Request) {
  try {
    const { action, key, value, keys } = await req.json();

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

    const { error } = await supabase.from("site_configs").upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to execute site config API:", err);
    return apiFailure(err);
  }
}
