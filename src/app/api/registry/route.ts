import defaults from "@config/ui/registry.json";
import { apiFailure, readConfig, serverDatabase } from "@/lib/serverDatabase";
import { publicRegistry } from "@/lib/registry";

export async function GET() {
  try {
    const row = await readConfig(serverDatabase(), "registry");
    const value = { ...defaults, ...(row?.value ?? {}) };
    return Response.json({ success: true, value: publicRegistry(value) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
