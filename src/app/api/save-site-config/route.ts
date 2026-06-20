import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const passcodeHeader = req.headers.get("x-admin-passcode");
    const { action, key, value, keys } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials missing from environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin passcode before allowing any writes
    const { data: adminConfigRow } = await supabase
      .from("site_configs")
      .select("value")
      .eq("key", "admin")
      .single();
    
    const correctPasscode = adminConfigRow?.value?.passcode || "indio2027";

    if (!passcodeHeader || passcodeHeader !== correctPasscode) {
      return NextResponse.json({ success: false, error: "Unauthorized: Invalid admin passcode" }, { status: 401 });
    }

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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
