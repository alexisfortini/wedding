import { generateAislePlannerCSVResponse } from "@/lib/exportCsvHelper";

export async function GET(request: Request) {
  return generateAislePlannerCSVResponse("group", request);
}
