import { apiFailure, ApiError, isAdminRequest, readConfig, serverDatabase } from "@/lib/serverDatabase";
import adminDefaults from "@config/ui/admin.json";

const publicKeys = new Set(["general", "story", "faq", "registry", "travel", "map", "images", "weekend", "dj_lineup", "gallery", "meals", "admin"]);

export async function GET(req: Request) {
  try {
    const key = new URL(req.url).searchParams.get("key");
    if (!key || key.length > 100) throw new ApiError("A valid configuration key is required.", 400);
    const db = serverDatabase();
    const admin = await isAdminRequest(req, db);
    if (!publicKeys.has(key) && !admin) throw new ApiError("This information requires an admin sign-in.", 401);
    const row = await readConfig(db, key);
    let value = row?.value ?? null;
    if (key === "admin") {
      value = value ?? adminDefaults;
      if (!admin) value = { admins: value.admins ?? [] };
    }
    return Response.json({ success: true, value }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiFailure(error); }
}
