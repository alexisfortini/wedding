import { NextResponse } from "next/server";
import { apiFailure, readAllRows, serverDatabase } from "./serverDatabase";
import { exportToAislePlanner, convertToAislePlannerCSV } from "@/lib/aislePlannerExporter";


export async function generateAislePlannerCSVResponse(layoutMode: "group" | "individual", request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    // Strict security key check from environment variable
    const expectedKey = process.env.EXPORT_SECRET_KEY;
    if (!expectedKey || !key || key !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized access: valid secret API key required" }, { status: 401 });
    }

    const db = serverDatabase();
    const [guestsList, partiesList, groupsList, guestGroupsList, guestEventsList, eventsList, configs] = await Promise.all(
      ["guests", "parties", "groups", "guest_groups", "guest_events", "events", "site_configs"].map(table => readAllRows(db, table))
    );
    const mealsValue = configs.find(row => row.key === "meals")?.value;
    const mealsConfig = typeof mealsValue === "string" ? JSON.parse(mealsValue) : mealsValue;

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
    return apiFailure(error);
  }
}
