import defaultRegistryConfig from "@config/ui/registry.json";
import { apiFailure, ApiError, requireAdmin, serverDatabase, updateConfig } from "@/lib/serverDatabase";
import { publicRegistry } from "@/lib/registry";

export async function POST(req: Request) {
  try {
    const { itemId, isPurchased = true, purchasedBy = "", purchasedNote = "" } = await req.json();
    if (typeof itemId !== "string" || !itemId || itemId.length > 200 || typeof isPurchased !== "boolean" ||
      typeof purchasedBy !== "string" || purchasedBy.length > 200 || typeof purchasedNote !== "string" || purchasedNote.length > 2000) {
      throw new ApiError("Please check the gift details and try again.", 400);
    }
    const db = serverDatabase();
    if (!isPurchased) await requireAdmin(req, db);
    const registryConfig = await updateConfig(db, "registry", defaultRegistryConfig, saved => {
      const config = { ...defaultRegistryConfig, ...saved };
      const item = config.items?.find((entry: any) => entry.id === itemId && entry.enabled !== false);
      if (!item) throw new ApiError("This gift is no longer available. Please refresh the registry.", 404);
      if (isPurchased && (item.is_purchased || (item.quantity_purchased ?? 0) + (item.guest_reported_quantity ?? 0) >= (item.quantity_requested ?? 1))) throw new ApiError("This gift has already been claimed. Please refresh the registry.", 409);
      return { ...config, items: config.items.map((entry: any) => entry.id !== itemId ? entry : {
        ...entry,
        // A guest report is not proof of payment and cannot update a retailer.
        is_purchased: isPurchased ? entry.is_purchased ?? false : false,
        quantity_purchased: isPurchased ? entry.quantity_purchased ?? 0 : 0,
        guest_reported_quantity: isPurchased ? (entry.guest_reported_quantity ?? 0) + 1 : 0,
        guest_reports: isPurchased ? [...(entry.guest_reports ?? []), { name: purchasedBy.trim() || "A wonderful guest", note: purchasedNote.trim(), at: new Date().toISOString() }] : entry.guest_reports ?? [],
        purchase_source: isPurchased ? entry.purchase_source ?? "guest" : null,
        purchased_by: isPurchased ? purchasedBy.trim() || "A wonderful guest" : null,
        purchased_at: isPurchased ? new Date().toISOString() : null,
        purchased_note: isPurchased ? purchasedNote.trim() : null,
      }) };
    });
    return Response.json({ success: true, registryConfig: publicRegistry(registryConfig) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
