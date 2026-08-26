import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import defaultRegistryConfig from "@config/ui/registry.json";

export async function POST(req: Request) {
  try {
    const { itemId, isPurchased, purchasedBy, purchasedNote } = await req.json();

    if (!itemId) {
      return NextResponse.json({ success: false, error: "Item ID is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let currentConfig = defaultRegistryConfig;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 1. Fetch current registry config from site_configs
      const { data: configRow } = await supabase
        .from("site_configs")
        .select("value")
        .eq("key", "registry")
        .single();

      if (configRow?.value) {
        currentConfig = configRow.value;
      }

      // 2. Update the target item
      const updatedItems = (currentConfig.items || []).map((item: any) => {
        if (item.id === itemId) {
          return {
            ...item,
            is_purchased: isPurchased !== undefined ? isPurchased : true,
            purchased_by: isPurchased ? (purchasedBy?.trim() || "A wonderful guest") : null,
            purchased_at: isPurchased ? new Date().toISOString() : null,
            purchased_note: isPurchased ? (purchasedNote?.trim() || "") : null
          };
        }
        return item;
      });

      const newConfig = {
        ...currentConfig,
        items: updatedItems
      };

      // 3. Upsert to Supabase
      const { error: upsertError } = await supabase
        .from("site_configs")
        .upsert({
          key: "registry",
          value: newConfig,
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        console.warn("Supabase upsert warning for registry claim:", upsertError);
      }

      return NextResponse.json({
        success: true,
        registryConfig: newConfig
      });
    }

    // Fallback if Supabase is not configured: update local state memory
    const updatedItems = (currentConfig.items || []).map((item: any) => {
      if (item.id === itemId) {
        return {
          ...item,
          is_purchased: isPurchased !== undefined ? isPurchased : true,
          purchased_by: isPurchased ? (purchasedBy?.trim() || "A wonderful guest") : null,
          purchased_at: isPurchased ? new Date().toISOString() : null,
          purchased_note: isPurchased ? (purchasedNote?.trim() || "") : null
        };
      }
      return item;
    });

    const newConfig = {
      ...currentConfig,
      items: updatedItems
    };

    return NextResponse.json({
      success: true,
      registryConfig: newConfig
    });
  } catch (err: any) {
    console.error("Failed to process registry claim:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
