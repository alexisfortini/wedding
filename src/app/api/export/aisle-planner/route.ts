import { generateAislePlannerCSVResponse } from "@/lib/exportCsvHelper";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const layoutParam = searchParams.get("layout") || searchParams.get("view") || "group";
  const layout = layoutParam === "individual" ? "individual" : "group";
  return generateAislePlannerCSVResponse(layout, request);
}
