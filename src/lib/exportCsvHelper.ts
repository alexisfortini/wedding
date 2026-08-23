import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { exportToAislePlanner, convertToAislePlannerCSV } from "@/lib/aislePlannerExporter";

import guestsSeed from "@config/db/guests.json";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function parseGuestsSeed(seed: any[]) {
  const parsedGuests: any[] = [];
  const parsedParties: any[] = [];
  (seed || []).forEach((partyInfo: any, pIdx: number) => {
    const partyId = `party-${pIdx}-${partyInfo.party_name}`;
    parsedParties.push({ id: partyId, name: partyInfo.party_name });
    (partyInfo.guests || []).forEach((g: any, gIdx: number) => {
      parsedGuests.push({
        id: `guest-${pIdx}-${gIdx}-${g.first_name}-${g.last_name}`,
        first_name: g.first_name,
        last_name: g.last_name,
        email: g.email || null,
        phone: g.phone || null,
        party_id: partyId,
        address: g.address || partyInfo.address || null,
        rsvp_status: g.rsvp_status || "pending",
        notes: g.notes || "",
        is_plus_one: g.is_plus_one || false,
        parent_guest_id: g.parent_guest_id || null,
        plus_ones_allowed: g.plus_ones_allowed || 0,
        age: g.age || "Adult",
        needs_highchair: g.needs_highchair || false,
        in_wheelchair: g.in_wheelchair || false
      });
    });
  });
  return { parsedGuests, parsedParties };
}

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
      const { parsedGuests, parsedParties } = parseGuestsSeed(guestsSeed);
      guestsList = parsedGuests;
      partiesList = parsedParties;
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
