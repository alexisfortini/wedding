import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60; // 60 seconds max duration

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials missing from environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const getSiteConfigs = async () => {
      try {
        return await supabase.from("site_configs").select("*");
      } catch (err: any) {
        return { error: err, data: null };
      }
    };

    // 1. Fetch all data directly from Supabase concurrently
    const [partiesRes, guestsRes, groupsRes, guestGroupsRes, eventsRes, siteConfigsRes] = await Promise.all([
      supabase.from("parties").select("*").order("name"),
      supabase.from("guests").select("*").order("last_name").order("first_name"),
      supabase.from("groups").select("*").order("name"),
      supabase.from("guest_groups").select("*"),
      supabase.from("events").select("*").order("date").order("start_time"),
      getSiteConfigs()
    ]);

    if (partiesRes.error) throw partiesRes.error;
    if (guestsRes.error) throw guestsRes.error;
    if (groupsRes.error) throw groupsRes.error;
    if (guestGroupsRes.error) throw guestGroupsRes.error;
    if (eventsRes.error) throw eventsRes.error;

    const parties = partiesRes.data || [];
    const guests = guestsRes.data || [];
    const groups = groupsRes.data || [];
    const guestGroups = guestGroupsRes.data || [];
    const events = eventsRes.data || [];
    const siteConfigs = siteConfigsRes?.data || [];

    // 2. Reconstruct groups.json (Array of strings)
    const groupsConfig = groups.map((g) => g.name);

    // 3. Reconstruct events.json
    const eventsConfig = events.map((e) => {
      const groupName = e.group_id
        ? groups.find((g) => g.id === e.group_id)?.name || null
        : null;
      return {
        title: e.title,
        description: e.description || null,
        date: e.date,
        start_time: e.start_time,
        end_time: e.end_time || null,
        location: e.location,
        dress_code: e.dress_code || null,
        is_public: e.is_public,
        group: groupName,
        needs_rsvp: e.needs_rsvp !== false
      };
    });

    // 4. Reconstruct guests.json (Parties and their nested guests)
    const guestsByParty: Record<string, typeof guests> = {};
    guests.forEach((g) => {
      if (g.party_id) {
        if (!guestsByParty[g.party_id]) {
          guestsByParty[g.party_id] = [];
        }
        guestsByParty[g.party_id].push(g);
      }
    });

    const guestsConfig = parties.map((p) => {
      const partyGuests = guestsByParty[p.id] || [];
      return {
        party_name: p.name,
        guests: partyGuests.map((g) => {
          const assignedGroupNames = guestGroups
            .filter((gg) => gg.guest_id === g.id)
            .map((gg) => groups.find((grp) => grp.id === gg.group_id)?.name)
            .filter(Boolean);

          return {
            first_name: g.first_name,
            last_name: g.last_name,
            email: g.email || null,
            phone: g.phone || null,
            address: g.address || null,
            groups: assignedGroupNames,
            rsvp_status: g.rsvp_status,
            notes: g.notes || "",
            is_plus_one: g.is_plus_one,
            plus_ones_allowed: g.plus_ones_allowed,
            age: g.age || "Adult",
            needs_highchair: g.needs_highchair,
            in_wheelchair: g.in_wheelchair,
          };
        }),
      };
    });

    // Capture guests with no party association (if any) and list them as individual parties
    const individualGuests = guests.filter((g) => !g.party_id);
    const individualGuestsConfig = individualGuests.map((g) => {
      const assignedGroupNames = guestGroups
        .filter((gg) => gg.guest_id === g.id)
        .map((gg) => groups.find((grp) => grp.id === gg.group_id)?.name)
        .filter(Boolean);

      return {
        party_name: `${g.first_name} ${g.last_name} Household`,
        guests: [
          {
            first_name: g.first_name,
            last_name: g.last_name,
            email: g.email || null,
            phone: g.phone || null,
            address: g.address || null,
            groups: assignedGroupNames,
            rsvp_status: g.rsvp_status,
            notes: g.notes || "",
            is_plus_one: g.is_plus_one,
            plus_ones_allowed: g.plus_ones_allowed,
            age: g.age || "Adult",
            needs_highchair: g.needs_highchair,
            in_wheelchair: g.in_wheelchair,
          },
        ],
      };
    });

    const finalGuestsConfig = [...guestsConfig, ...individualGuestsConfig];

    // 5. Raw database dump
    const rawBackup = {
      parties,
      guests,
      groups,
      guest_groups: guestGroups,
      events,
      site_configs: siteConfigs,
    };

    // Determine if we are running in localhost or Cloud Run
    // K_SERVICE env variable is set automatically by Google Cloud Run
    const isCloudRun = !!process.env.K_SERVICE;

    let filesWritten = false;
    let localPaths: string[] = [];

    // Write to the filesystem
    try {
      const configDbDir = path.join(process.cwd(), "config", "db");
      const configUiDir = path.join(process.cwd(), "config", "ui");
      const backupDir = path.join(process.cwd(), "database_backups");

      if (!fs.existsSync(configDbDir)) fs.mkdirSync(configDbDir, { recursive: true });
      if (!fs.existsSync(configUiDir)) fs.mkdirSync(configUiDir, { recursive: true });
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const guestsPath = path.join(configDbDir, "guests.json");
      const eventsPath = path.join(configDbDir, "events.json");
      const groupsPath = path.join(configDbDir, "groups.json");
      const backupPath = path.join(backupDir, "supabase_backup.json");

      fs.writeFileSync(guestsPath, JSON.stringify(finalGuestsConfig, null, 2));
      fs.writeFileSync(eventsPath, JSON.stringify(eventsConfig, null, 2));
      fs.writeFileSync(groupsPath, JSON.stringify(groupsConfig, null, 2));
      fs.writeFileSync(backupPath, JSON.stringify(rawBackup, null, 2));

      localPaths = [guestsPath, eventsPath, groupsPath, backupPath];

      // Overwrite local config/ui files if they are in siteConfigs
      const uiKeys = ["admin", "dj_lineup", "faq", "general", "map", "registry", "story", "travel", "weekend", "images", "meals"];
      for (const k of uiKeys) {
        const found = siteConfigs.find((item: any) => item.key === k);
        if (found && found.value) {
          const filePath = path.join(configUiDir, `${k}.json`);
          fs.writeFileSync(filePath, JSON.stringify(found.value, null, 2));
          localPaths.push(filePath);
        }
      }

      filesWritten = true;
    } catch (fsError: any) {
      console.error("Failed to write to filesystem:", fsError);
    }

    if (isCloudRun) {
      return NextResponse.json({
        success: true,
        environment: "production",
        message:
          "Successfully fetched Supabase data. Note: Since the app is running in production Cloud Run, local files in Git were not changed permanently. Use the 'Download Backup File' button to download a copy to your computer.",
        data: rawBackup,
      });
    }

    return NextResponse.json({
      success: true,
      environment: "local",
      message: `Successfully synchronized Supabase data to your local project config files!`,
      files: localPaths.map((p) => path.basename(p)),
    });
  } catch (error: any) {
    console.error("SYNC_TO_LOCAL_ERROR:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error during synchronization" },
      { status: 500 }
    );
  }
}
