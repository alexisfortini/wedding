import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import defaultRegistryConfig from "@config/ui/registry.json";

export interface FundContribution {
  id: string;
  guestName: string;
  amount: number;
  paymentMethod: 'venmo' | 'zelle' | 'cash';
  note?: string;
  createdAt: string; // ISO date
  isVerified: boolean; // default true or pending
  isPublic: boolean;   // default true (controls inclusion in total)
}

function getLocalContributions(): FundContribution[] {
  const filePath = path.join(process.cwd(), "config", "db", "contributions.json");
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  return [];
}

function saveLocalContributions(contributions: FundContribution[]) {
  const dirPath = path.join(process.cwd(), "config", "db");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join(dirPath, "contributions.json");
  fs.writeFileSync(filePath, JSON.stringify(contributions, null, 2));
}

function mapRowToContribution(row: any): FundContribution {
  return {
    id: String(row.id),
    guestName: String(row.guest_name || row.guestName || "Anonymous Guest"),
    amount: Number(row.amount || 0),
    paymentMethod: (row.payment_method || row.paymentMethod || "venmo") as 'venmo' | 'zelle' | 'cash',
    note: row.note || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    isVerified: row.is_verified ?? row.isVerified ?? true,
    isPublic: row.is_public ?? row.isPublic ?? true,
  };
}

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const passcodeHeader = req.headers.get("x-admin-passcode");

    let contributions: FundContribution[] = [];
    let initialRaised = (defaultRegistryConfig as any)?.cash_fund?.initial_raised || 0;
    let targetAmount = (defaultRegistryConfig as any)?.cash_fund?.target_amount || 5000;
    let correctPasscode = "indio2027";

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Attempt 1: Fetch registry config for initial raised & target
      try {
        const { data: regRow } = await supabase
          .from("site_configs")
          .select("value")
          .eq("key", "registry")
          .single();
        if (regRow?.value?.cash_fund) {
          if (typeof regRow.value.cash_fund.initial_raised === "number") {
            initialRaised = regRow.value.cash_fund.initial_raised;
          }
          if (typeof regRow.value.cash_fund.target_amount === "number") {
            targetAmount = regRow.value.cash_fund.target_amount;
          }
        }
      } catch (e) {
        // Ignore registry config fetch error
      }

      // Check admin passcode
      try {
        const { data: adminConfigRow } = await supabase
          .from("site_configs")
          .select("value")
          .eq("key", "admin")
          .single();
        if (adminConfigRow?.value?.passcode) {
          correctPasscode = adminConfigRow.value.passcode;
        }
      } catch (e) {
        // Ignore admin config fetch error
      }

      // Attempt 2: Fetch from dedicated fund_contributions table
      const { data: tableData, error: tableError } = await supabase
        .from("fund_contributions")
        .select("*")
        .order("created_at", { ascending: false });

      if (!tableError && tableData) {
        contributions = tableData.map(mapRowToContribution);
      } else {
        // Attempt 3: Fallback to site_configs 'fund_contributions' key
        const { data: configData } = await supabase
          .from("site_configs")
          .select("value")
          .eq("key", "fund_contributions")
          .single();

        if (configData?.value && Array.isArray(configData.value)) {
          contributions = configData.value.map(mapRowToContribution);
        } else {
          contributions = getLocalContributions();
        }
      }
    } else {
      contributions = getLocalContributions();
    }

    const publicContributions = contributions.filter((c) => c.isPublic !== false);
    const contributionsTotal = publicContributions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalRaised = Math.round((initialRaised + contributionsTotal) * 100) / 100;

    const isAdmin = Boolean(passcodeHeader && passcodeHeader === correctPasscode);

    return NextResponse.json({
      success: true,
      // Public visitors see totalRaised, targetAmount, and initialRaised.
      // Individual notes and amounts are only returned to authenticated admins.
      contributions: isAdmin ? contributions : [],
      totalRaised,
      targetAmount,
      initialRaised,
    });
  } catch (err: any) {
    console.error("GET /api/fund-contributions error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { guestName, amount, paymentMethod, note } = body;

    if (!guestName || typeof guestName !== "string" || !guestName.trim()) {
      return NextResponse.json({ success: false, error: "Please enter your name." }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ success: false, error: "Please enter a valid gift amount greater than $0." }, { status: 400 });
    }

    const normalizedMethod = ["venmo", "zelle", "cash"].includes(paymentMethod?.toLowerCase())
      ? paymentMethod.toLowerCase()
      : "venmo";

    const newContribution: FundContribution = {
      id: crypto.randomUUID(),
      guestName: guestName.trim(),
      amount: Math.round(numericAmount * 100) / 100,
      paymentMethod: normalizedMethod as 'venmo' | 'zelle' | 'cash',
      note: note && typeof note === "string" && note.trim() ? note.trim() : undefined,
      createdAt: new Date().toISOString(),
      isVerified: true,
      isPublic: true,
    };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let saved = false;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Attempt insert into fund_contributions table
      const { error: insertError } = await supabase.from("fund_contributions").insert({
        id: newContribution.id,
        guest_name: newContribution.guestName,
        amount: newContribution.amount,
        payment_method: newContribution.paymentMethod,
        note: newContribution.note || null,
        is_verified: newContribution.isVerified,
        is_public: newContribution.isPublic,
        created_at: newContribution.createdAt,
      });

      if (!insertError) {
        saved = true;
      } else {
        console.warn("fund_contributions table insert error, falling back to site_configs:", insertError.message);
        // Fallback to site_configs
        const { data: existingConfig } = await supabase
          .from("site_configs")
          .select("value")
          .eq("key", "fund_contributions")
          .single();

        const currentList: FundContribution[] = Array.isArray(existingConfig?.value)
          ? existingConfig.value
          : getLocalContributions();

        const updatedList = [newContribution, ...currentList];

        await supabase.from("site_configs").upsert({
          key: "fund_contributions",
          value: updatedList,
          updated_at: new Date().toISOString(),
        });
        saved = true;
      }
    }

    // Always keep local file updated for offline/dev resilience
    const localList = getLocalContributions();
    saveLocalContributions([newContribution, ...localList]);

    return NextResponse.json({
      success: true,
      contribution: newContribution,
    });
  } catch (err: any) {
    console.error("POST /api/fund-contributions error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const passcodeHeader = req.headers.get("x-admin-passcode");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let correctPasscode = "indio2027";

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: adminConfigRow } = await supabase
        .from("site_configs")
        .select("value")
        .eq("key", "admin")
        .single();
      if (adminConfigRow?.value?.passcode) {
        correctPasscode = adminConfigRow.value.passcode;
      }
    }

    if (!passcodeHeader || passcodeHeader !== correctPasscode) {
      return NextResponse.json({ success: false, error: "Unauthorized: Invalid admin passcode" }, { status: 401 });
    }

    const { id, isVerified, isPublic, amount, note, guestName } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Contribution ID required" }, { status: 400 });
    }

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      // Try update in fund_contributions table
      const updatePayload: Record<string, any> = {};
      if (isVerified !== undefined) updatePayload.is_verified = isVerified;
      if (isPublic !== undefined) updatePayload.is_public = isPublic;
      if (amount !== undefined) updatePayload.amount = Number(amount);
      if (note !== undefined) updatePayload.note = note;
      if (guestName !== undefined) updatePayload.guest_name = guestName;

      const { error: updateError } = await supabase
        .from("fund_contributions")
        .update(updatePayload)
        .eq("id", id);

      if (updateError) {
        // Fallback update in site_configs
        const { data: existingConfig } = await supabase
          .from("site_configs")
          .select("value")
          .eq("key", "fund_contributions")
          .single();

        if (Array.isArray(existingConfig?.value)) {
          const updated = existingConfig.value.map((item: any) =>
            item.id === id ? { ...item, ...updatePayload, ...(isVerified !== undefined ? { isVerified } : {}), ...(isPublic !== undefined ? { isPublic } : {}) } : item
          );
          await supabase.from("site_configs").upsert({
            key: "fund_contributions",
            value: updated,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    // Always update local file for resilience
    const localList = getLocalContributions();
    const updatedLocal = localList.map((c) =>
      c.id === id
        ? {
            ...c,
            ...(isVerified !== undefined ? { isVerified } : {}),
            ...(isPublic !== undefined ? { isPublic } : {}),
            ...(amount !== undefined ? { amount: Number(amount) } : {}),
            ...(note !== undefined ? { note } : {}),
            ...(guestName !== undefined ? { guestName } : {}),
          }
        : c
    );
    saveLocalContributions(updatedLocal);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/fund-contributions error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const passcodeHeader = req.headers.get("x-admin-passcode");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let correctPasscode = "indio2027";

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: adminConfigRow } = await supabase
        .from("site_configs")
        .select("value")
        .eq("key", "admin")
        .single();
      if (adminConfigRow?.value?.passcode) {
        correctPasscode = adminConfigRow.value.passcode;
      }
    }

    if (!passcodeHeader || passcodeHeader !== correctPasscode) {
      return NextResponse.json({ success: false, error: "Unauthorized: Invalid admin passcode" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Contribution ID required" }, { status: 400 });
    }

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      // Try delete from fund_contributions table
      const { error: deleteError } = await supabase
        .from("fund_contributions")
        .delete()
        .eq("id", id);

      if (deleteError) {
        // Fallback delete from site_configs
        const { data: existingConfig } = await supabase
          .from("site_configs")
          .select("value")
          .eq("key", "fund_contributions")
          .single();

        if (Array.isArray(existingConfig?.value)) {
          const updated = existingConfig.value.filter((item: any) => item.id !== id);
          await supabase.from("site_configs").upsert({
            key: "fund_contributions",
            value: updated,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    // Always update local file
    const localList = getLocalContributions();
    saveLocalContributions(localList.filter((c) => c.id !== id));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/fund-contributions error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
