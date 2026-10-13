import { z } from "zod";
import defaultRegistryConfig from "@config/ui/registry.json";
import { apiFailure, ApiError, isAdminRequest, readConfig, requireAdmin, serverDatabase, updateConfig, type ServerDatabase } from "@/lib/serverDatabase";

const amountSchema = z.coerce.number().finite().min(0.01).max(1000000).transform(value => Math.round(value * 100) / 100);
const giftSchema = z.object({
  id: z.string().uuid().optional(),
  guestName: z.string().trim().min(1).max(200),
  amount: amountSchema,
  paymentMethod: z.enum(["venmo", "zelle", "cash"]),
  note: z.string().trim().max(2000).optional(),
});
const patchSchema = z.object({
  id: z.string().uuid(),
  guestName: z.string().trim().min(1).max(200).optional(),
  amount: amountSchema.optional(),
  isVerified: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  note: z.string().max(2000).optional(),
});

export interface FundContribution {
  id: string;
  guestName: string;
  amount: number;
  paymentMethod: "venmo" | "zelle" | "cash";
  note?: string;
  createdAt: string;
  isVerified: boolean;
  isPublic: boolean;
}

function fromRow(row: any): FundContribution {
  return {
    id: String(row.id), guestName: String(row.guest_name ?? row.guestName ?? "Anonymous Guest"),
    amount: Number(row.amount ?? 0), paymentMethod: row.payment_method ?? row.paymentMethod ?? "venmo",
    note: row.note || undefined, createdAt: row.created_at ?? row.createdAt,
    isVerified: row.is_verified ?? row.isVerified ?? true, isPublic: row.is_public ?? row.isPublic ?? true,
  };
}
const missingTable = (error: { code?: string }) => error.code === "42P01" || error.code === "PGRST205";
const sameGift = (a: FundContribution, b: FundContribution) => a.guestName === b.guestName && a.amount === b.amount && a.paymentMethod === b.paymentMethod && (a.note || "") === (b.note || "");

async function readContributions(db: ServerDatabase) {
  const entries: FundContribution[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("fund_contributions").select("*")
      .order("created_at", { ascending: false }).order("id").range(offset, offset + 999);
    if (error) {
      if (!missingTable(error)) throw new ApiError("Gift totals are temporarily unavailable. Please try again.");
      const row = await readConfig(db, "fund_contributions");
      if (row && !Array.isArray(row.value)) throw new ApiError("Gift totals are temporarily unavailable.");
      return (row?.value ?? []).map(fromRow) as FundContribution[];
    }
    entries.push(...(data ?? []).map(fromRow));
    if (!data || data.length < 1000) return entries;
  }
}

export async function GET(req: Request) {
  try {
    const db = serverDatabase();
    const [registry, contributions, admin] = await Promise.all([
      readConfig(db, "registry"), readContributions(db), isAdminRequest(req, db),
    ]);
    const fund = (registry?.value ?? defaultRegistryConfig).cash_fund ?? {};
    const initialRaised = Number(fund.initial_raised ?? 0);
    const targetAmount = Number(fund.target_amount ?? 5000);
    const cents = contributions.filter(c => c.isPublic).reduce((total, c) => total + Math.round(c.amount * 100), 0);
    return Response.json({ success: true, contributions: admin ? contributions : [],
      totalRaised: (Math.round(initialRaised * 100) + cents) / 100, initialRaised, targetAmount,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiFailure(error); }
}

export async function POST(req: Request) {
  try {
    const parsed = giftSchema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError("Please enter a name, valid amount, and payment method. Notes must be under 2,000 characters.", 400);
    const gift: FundContribution = { ...parsed.data, id: parsed.data.id ?? crypto.randomUUID(),
      createdAt: new Date().toISOString(), isVerified: true, isPublic: true };
    const db = serverDatabase();
    const { error } = await db.from("fund_contributions").insert({
      id: gift.id, guest_name: gift.guestName, amount: gift.amount, payment_method: gift.paymentMethod,
      note: gift.note || null, created_at: gift.createdAt, is_verified: gift.isVerified, is_public: gift.isPublic,
    });
    if (error) {
      if (missingTable(error)) {
        await updateConfig(db, "fund_contributions", [], value => {
          if (!Array.isArray(value)) throw new ApiError("Your gift could not be recorded. Please try again.");
          const existing = value.find((entry: any) => entry.id === gift.id);
          if (existing) {
            if (!sameGift(fromRow(existing), gift)) throw new ApiError("This submission has already been used. Please refresh before recording another gift.", 409);
            return value;
          }
          return [gift, ...value];
        });
      } else if (error.code === "23505") {
        const { data, error: lookupError } = await db.from("fund_contributions").select("*").eq("id", gift.id).maybeSingle();
        if (lookupError || !data || !sameGift(fromRow(data), gift)) throw new ApiError("This submission has already been used. Please refresh before recording another gift.", 409);
        return Response.json({ success: true, contribution: fromRow(data) });
      } else throw new ApiError("Your gift could not be recorded. Please try again.");
    }
    return Response.json({ success: true, contribution: gift });
  } catch (error) { return apiFailure(error); }
}

export async function PATCH(req: Request) {
  try {
    const db = serverDatabase();
    await requireAdmin(req, db);
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError("Please check the contribution details.", 400);
    const { id, ...changes } = parsed.data;
    if (!Object.keys(changes).length) throw new ApiError("No changes supplied.", 400);
    const payload: Record<string, unknown> = {};
    if (changes.guestName !== undefined) payload.guest_name = changes.guestName;
    if (changes.amount !== undefined) payload.amount = changes.amount;
    if (changes.isVerified !== undefined) payload.is_verified = changes.isVerified;
    if (changes.isPublic !== undefined) payload.is_public = changes.isPublic;
    if (changes.note !== undefined) payload.note = changes.note;
    const { data, error } = await db.from("fund_contributions").update(payload).eq("id", id).select("id");
    if (error && missingTable(error)) {
      await updateConfig(db, "fund_contributions", [], value => {
        if (!Array.isArray(value) || !value.some(entry => entry.id === id)) throw new ApiError("Contribution not found.", 404);
        return value.map(entry => entry.id === id ? { ...fromRow(entry), ...changes } : entry);
      });
    } else if (error) throw new ApiError("Your changes could not be saved. Please try again.");
    else if (!data?.length) throw new ApiError("Contribution not found.", 404);
    return Response.json({ success: true });
  } catch (error) { return apiFailure(error); }
}

export async function DELETE(req: Request) {
  try {
    const db = serverDatabase();
    await requireAdmin(req, db);
    const parsed = z.object({ id: z.string().uuid() }).safeParse(await req.json());
    if (!parsed.success) throw new ApiError("A valid contribution ID is required.", 400);
    const { id } = parsed.data;
    const { data, error } = await db.from("fund_contributions").delete().eq("id", id).select("id");
    if (error && missingTable(error)) {
      await updateConfig(db, "fund_contributions", [], value => {
        if (!Array.isArray(value) || !value.some(entry => entry.id === id)) throw new ApiError("Contribution not found.", 404);
        return value.filter(entry => entry.id !== id);
      });
    } else if (error) throw new ApiError("The contribution could not be removed. Please try again.");
    else if (!data?.length) throw new ApiError("Contribution not found.", 404);
    return Response.json({ success: true });
  } catch (error) { return apiFailure(error); }
}
