import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { exportToAislePlanner, convertToAislePlannerCSV } from "@/lib/aislePlannerExporter";

import { 
  DEFAULT_GUESTS, 
  DEFAULT_PARTIES, 
  DEFAULT_GROUPS, 
  DEFAULT_EVENTS, 
  DEFAULT_GUEST_GROUPS 
} from "@/lib/mockDatabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function generateAislePlannerCSVResponse(layoutMode: "group" | "individual", request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    // Strict security key check from environment variable
    const expectedKey = process.env.EXPORT_SECRET_KEY;
    if (!expectedKey || !key || key !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized access: valid secret API key required" }, { status: 401 });
    }

    let guestsList = [];
    let partiesList = [];
    let groupsList = [];
    let guestGroupsList = [];
    let guestEventsList = [];
    let eventsList = [];
    let mealsConfig = undefined;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
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

        guestsList = guests || [];
        partiesList = parties || [];
        groupsList = groups || [];
        guestGroupsList = guestGroups || [];
        guestEventsList = guestEvents || [];
        eventsList = events || [];

        const mealsConfigRow = (siteConfigs || []).find((c: any) => c.key === "meals");
        if (mealsConfigRow && mealsConfigRow.value) {
          try {
            mealsConfig = typeof mealsConfigRow.value === "string" 
              ? JSON.parse(mealsConfigRow.value) 
              : mealsConfigRow.value;
          } catch (e) {
            console.error("Error parsing meals config:", e);
          }
        }
      } catch (err) {
        console.error("Supabase fetch failed, falling back to local JSON seeds:", err);
      }
    }

    // Fallback to local JSON seeds if Supabase returned empty or was unavailable
    if (!Array.isArray(guestsList) || guestsList.length === 0) {
      guestsList = DEFAULT_GUESTS;
      partiesList = DEFAULT_PARTIES;
      groupsList = DEFAULT_GROUPS;
      guestGroupsList = DEFAULT_GUEST_GROUPS;
      eventsList = DEFAULT_EVENTS;
    }

    const apLayout = layoutMode === "group" ? "grouped" : "individual";

    const formattedRows = exportToAislePlanner(
      guestsList,
      partiesList,
      groupsList,
      guestGroupsList,
      guestEventsList,
      eventsList,
      apLayout,
      mealsConfig
    );

    const csvContent = convertToAislePlannerCSV(formattedRows);

    const todayDate = new Date().toISOString().split("T")[0];
    const filename = `wedding_guest_list_${layoutMode}_${todayDate}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  } catch (error: any) {
    console.error(`Error generating Aisle Planner CSV export API (${layoutMode}):`, error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
