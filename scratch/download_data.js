const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials missing from environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
  try {
    console.log("Fetching data from Supabase...");

    const getSiteConfigs = async () => {
      try {
        return await supabase.from("site_configs").select("*");
      } catch (err) {
        return { error: err, data: null };
      }
    };

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

    console.log(`Fetched ${parties.length} parties, ${guests.length} guests, ${groups.length} groups, ${events.length} events, ${siteConfigs.length} site configs.`);

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
    const guestsByParty = {};
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

    const configDbDir = path.join(__dirname, "../config/db");
    const configUiDir = path.join(__dirname, "../config/ui");
    const backupDir = path.join(__dirname, "../database_backups");

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

    console.log(`Saved database seeds:`);
    console.log(`- ${guestsPath}`);
    console.log(`- ${eventsPath}`);
    console.log(`- ${groupsPath}`);
    console.log(`- ${backupPath}`);

    // Overwrite local config/ui files if they are in siteConfigs
    const uiKeys = ["admin", "dj_lineup", "faq", "general", "map", "registry", "story", "travel", "weekend", "images", "meals", "gallery"];
    for (const k of uiKeys) {
      const found = siteConfigs.find((item) => item.key === k);
      if (found && found.value) {
        const filePath = path.join(configUiDir, `${k}.json`);
        fs.writeFileSync(filePath, JSON.stringify(found.value, null, 2));
        console.log(`- Overwrote UI Config: ${filePath}`);
      }
    }

    console.log("Synchronization complete!");
  } catch (error) {
    console.error("Synchronization failed:", error);
    process.exit(1);
  }
}

sync();
