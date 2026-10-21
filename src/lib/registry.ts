export interface RegistryStore {
  id: string;
  name: string;
  url: string;
  description?: string;
  guest_note?: string;
  enabled?: boolean;
  visibility_status?: string;
  partner_status?: string;
  photo_status?: string;
  last_verified_at?: string;
}

export interface RegistryGift {
  id: string;
  title: string;
  store_id?: string;
  store_name?: string;
  store_url?: string;
  item_url?: string;
  image_url?: string;
  price?: string;
  category?: string;
  description?: string;
  enabled?: boolean;
  is_purchased?: boolean;
  quantity_requested?: number;
  quantity_purchased?: number;
  guest_reported_quantity?: number;
  purchase_source?: string;
  vendor_verified_at?: string;
  vendor_item_id?: string;
  registry_added?: boolean;
  stock_status?: string;
  setup_note?: string;
}

export function giftStatus(item: RegistryGift) {
  const requested = item.quantity_requested ?? 1;
  if ((item.quantity_purchased ?? 0) >= requested || (item.is_purchased && item.purchase_source !== "guest")) return "purchased";
  if ((item.guest_reported_quantity ?? 0) > 0 || (item.is_purchased && item.purchase_source === "guest")) return "reported";
  if (item.stock_status === "out_of_stock") return "unavailable";
  return "available";
}

export function giftPrice(item: RegistryGift) {
  const match = item.price?.match(/[\d,]+(?:\.\d+)?/);
  return match ? Number(match[0].replaceAll(",", "")) : null;
}

// Do not send donor identities, private notes, or pending retailer actions to guests.
export function publicRegistry(config: Record<string, unknown>) {
  const privateFields = new Set(["purchased_by", "purchased_note", "guest_reports"]);
  const rest = Object.fromEntries(Object.entries(config).filter(([key]) => key !== "vendor_actions"));
  const items = Array.isArray(config.items) ? config.items : [];
  return { ...rest, items: items.filter(item => item && typeof item === "object").map((item: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(item).filter(([key]) => !privateFields.has(key)))) };
}
