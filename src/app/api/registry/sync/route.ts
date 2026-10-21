import { z } from "zod";
import defaults from "@config/ui/registry.json";
import { apiFailure, ApiError, readConfig, requireAdmin, serverDatabase, updateConfig } from "@/lib/serverDatabase";
import type { RegistryGift, RegistryStore } from "@/lib/registry";

const observation = z.object({
  storeId: z.string().min(1).max(100),
  observedAt: z.iso.datetime(),
  items: z.array(z.object({
    id: z.string().min(1).max(200),
    requested: z.number().int().min(1).max(1000),
    purchased: z.number().int().min(0).max(1000),
    resolveGuestReport: z.boolean().default(false),
  })).min(1).max(500),
});

// Import an admin's observed retailer quantities. This endpoint does not claim to
// scrape stores or make purchases; unsupported integrations must stay explicit.
export async function POST(req: Request) {
  try {
    const db = serverDatabase();
    await requireAdmin(req, db);
    const parsed = observation.safeParse(await req.json());
    if (!parsed.success) throw new ApiError("Provide a store, observation time, and valid gift quantities.", 400);
    const input = parsed.data;
    if (Date.parse(input.observedAt) > Date.now() + 60000) throw new ApiError("The observation time cannot be in the future.", 400);
    if (new Set(input.items.map(item => item.id)).size !== input.items.length || input.items.some(item => item.purchased > item.requested)) throw new ApiError("Each gift must occur once and purchased quantities cannot exceed requested quantities.", 400);
    const next = await updateConfig(db, "registry", defaults, saved => {
      const config = { ...defaults, ...saved };
      const store = config.stores?.find((entry: RegistryStore) => entry.id === input.storeId);
      if (!store) throw new ApiError("This store is not configured.", 404);
      for (const incoming of input.items) {
        const current = config.items?.find((item: RegistryGift) => item.id === incoming.id && item.store_id === input.storeId);
        if (!current) throw new ApiError("A gift does not belong to this store. Refresh and try again.", 400);
        if (current.vendor_verified_at && Date.parse(current.vendor_verified_at) > Date.parse(input.observedAt)) throw new ApiError("Newer retailer information is already saved. Refresh before updating.", 409);
      }
      return { ...config, items: config.items.map((item: RegistryGift) => {
        const incoming = input.items.find(entry => entry.id === item.id);
        if (!incoming) return item;
        return { ...item, quantity_requested: incoming.requested, quantity_purchased: incoming.purchased,
          is_purchased: incoming.purchased >= incoming.requested,
          purchase_source: "retailer", vendor_verified_at: input.observedAt,
          guest_reported_quantity: incoming.resolveGuestReport ? 0 : item.guest_reported_quantity ?? 0,
        };
      }) };
    });
    return Response.json({ success: true, value: next }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiFailure(error); }
}

export async function GET(req: Request) {
  try {
    const db = serverDatabase();
    await requireAdmin(req, db);
    const row = await readConfig(db, "registry");
    return Response.json({ success: true, value: { ...defaults, ...(row?.value ?? {}) }, mode: "admin_reconciliation",
      automaticSync: false, message: "Retailer accounts are managed at each store. Import verified quantities here; website reports do not update retailers." },
    { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiFailure(error); }
}
