import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { exportToAislePlanner, convertToAislePlannerCSV } from "@/lib/aislePlannerExporter";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const layoutParam = searchParams.get("layout") || searchParams.get("view") || "grouped";
    const layout = layoutParam === "individual" ? "individual" : "grouped";

    // Optional security key check
    const expectedKey = process.env.EXPORT_SECRET_KEY || "wedding2026";
    if (key && key !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized invalid key" }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Database environment variables missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all tables concurrently
    const [
      { data: guests },
      { data: parties },
      { data: groups },
      { data: guestGroups },
      { data: guestEvents },
      { data: events },
      { data: siteConfigs }
    ] = await Promise.all([
      supabase.from("guests").select("*"),
      supabase.from("parties").select("*"),
      supabase.from("groups").select("*"),
      supabase.from("guest_groups").select("*"),
      supabase.from("guest_events").select("*"),
      supabase.from("events").select("*"),
      supabase.from("site_configs").select("*")
    ]);

    const mealsConfigRow = (siteConfigs || []).find((c: any) => c.key === "meals");
    let mealsConfig = undefined;
    if (mealsConfigRow && mealsConfigRow.value) {
      try {
        mealsConfig = typeof mealsConfigRow.value === "string" 
          ? JSON.parse(mealsConfigRow.value) 
          : mealsConfigRow.value;
      } catch (e) {
        console.error("Error parsing meals config:", e);
      }
    }

    // Filter out planners from export if desired or keep all
    const formattedRows = exportToAislePlanner(
      guests || [],
      parties || [],
      groups || [],
      guestGroups || [],
      guestEvents || [],
      events || [],
      layout,
      mealsConfig
    );

    const csvContent = convertToAislePlannerCSV(formattedRows);

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `inline; filename="aisle_planner_${layout}_export.csv"`,
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  } catch (error: any) {
    console.error("Error generating Aisle Planner CSV export API:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
