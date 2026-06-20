import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60; // 60 seconds max duration

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ success: false, error: "Missing key parameter" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials missing from environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("site_configs")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      // If the row doesn't exist or is not found, return null value instead of failing
      return NextResponse.json({ success: true, value: null });
    }

    return NextResponse.json({ success: true, value: data?.value });
  } catch (err: any) {
    console.error("Failed to execute get site config API:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
