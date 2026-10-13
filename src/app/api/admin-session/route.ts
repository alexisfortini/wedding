import { apiFailure, requireAdmin, serverDatabase } from "@/lib/serverDatabase";

export async function POST(req: Request) {
  try {
    await requireAdmin(req, serverDatabase());
    return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
