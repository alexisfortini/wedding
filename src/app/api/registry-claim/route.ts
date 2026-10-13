import defaultRegistryConfig from "@config/ui/registry.json";
import { apiFailure, ApiError, requireAdmin, serverDatabase, updateConfig } from "@/lib/serverDatabase";

export async function POST(req: Request) {
  try {
    const { itemId, isPurchased = true, purchasedBy = "", purchasedNote = "" } = await req.json();
    if (typeof itemId !== "string" || !itemId || itemId.length > 200 || typeof isPurchased !== "boolean" ||
      typeof purchasedBy !== "string" || purchasedBy.length > 200 || typeof purchasedNote !== "string" || purchasedNote.length > 2000) {
      throw new ApiError("Please check the gift details and try again.", 400);
    }
    const db = serverDatabase();
    if (!isPurchased) await requireAdmin(req, db);
    const registryConfig = await updateConfig(db, "registry", defaultRegistryConfig, config => {
      const item = config.items?.find((entry: any) => entry.id === itemId && entry.enabled !== false);
      if (!item) throw new ApiError("This gift is no longer available. Please refresh the registry.", 404);
      if (isPurchased && item.is_purchased) throw new ApiError("This gift has already been claimed. Please refresh the registry.", 409);
      return { ...config, items: config.items.map((entry: any) => entry.id !== itemId ? entry : {
        ...entry, is_purchased: isPurchased,
        purchased_by: isPurchased ? purchasedBy.trim() || "A wonderful guest" : null,
        purchased_at: isPurchased ? new Date().toISOString() : null,
        purchased_note: isPurchased ? purchasedNote.trim() : null,
      }) };
    });
    return Response.json({ success: true, registryConfig });
  } catch (error) { return apiFailure(error); }
}
