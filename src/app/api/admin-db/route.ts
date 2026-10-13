import { NextResponse } from "next/server";
import { apiFailure, ApiError, readAllRows, requireAdmin, serverDatabase } from "@/lib/serverDatabase";

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();

    const supabase = serverDatabase();
    await requireAdmin(req, supabase);

    if (action === "getBackups" || action === "pruneBackups") {
      const { data, error } = await supabase.from("site_configs").select("key,value,updated_at")
        .like("key", "backup_%").order("updated_at", { ascending: false });
      if (error) throw error;
      if (action === "getBackups") return NextResponse.json({ success: true, data: (data ?? []).map(row => ({
        id: row.key, timestamp: row.updated_at, action: row.value?.action || "Backup", data: row.value?.data,
      })) }, { headers: { "Cache-Control": "no-store" } });
      const keys = (data ?? []).slice(50).map(row => row.key);
      if (keys.length) {
        const { error: pruneError } = await supabase.from("site_configs").delete().in("key", keys);
        if (pruneError) throw pruneError;
      }
      return NextResponse.json({ success: true });
    }
    if (action === "exportDatabaseJSON") {
      const tables = ["parties", "guests", "groups", "guest_groups", "events", "guest_events", "site_configs"];
      const rows = await Promise.all(tables.map(table => readAllRows(supabase, table)));
      // Do not recursively embed older backups inside every new backup.
      rows[tables.indexOf("site_configs")] = rows[tables.indexOf("site_configs")].filter(row => !row.key.startsWith("backup_"));
      return NextResponse.json({ success: true, data: Object.fromEntries(tables.map((table, index) => [table, rows[index]])) },
        { headers: { "Cache-Control": "no-store" } });
    }


    if (action === "saveParty") {
      const { error } = await supabase.from("parties").upsert({
        id: payload.party.id,
        name: payload.party.name
      });
      if (error) throw error;
    } 
    else if (action === "deleteParty") {
      // Unlink guests from this party first so cascade delete does not remove individuals
      const { error: unlinkError } = await supabase.from("guests").update({ party_id: null }).eq("party_id", payload.id);
      if (unlinkError) throw unlinkError;
      const { error } = await supabase.from("parties").delete().eq("id", payload.id);
      if (error) throw error;
    } 
    else if (action === "saveGuest") {
      const { error } = await supabase.from("guests").upsert({
        id: payload.guest.id,
        first_name: payload.guest.first_name,
        last_name: payload.guest.last_name,
        email: payload.guest.email,
        phone: payload.guest.phone,
        party_id: payload.guest.party_id,
        address: payload.guest.address,
        rsvp_status: payload.guest.rsvp_status,
        notes: payload.guest.notes,
        is_plus_one: payload.guest.is_plus_one,
        parent_guest_id: payload.guest.parent_guest_id,
        plus_ones_allowed: payload.guest.plus_ones_allowed,
        age: payload.guest.age,
        needs_highchair: payload.guest.needs_highchair,
        in_wheelchair: payload.guest.in_wheelchair
      });
      if (error) throw error;

      // Link events mapping for all public events on save
      try {
        const { data: dbEvents } = await supabase.from("events").select("id,is_public");
        if (dbEvents) {
          const publicEvents = dbEvents.filter(e => e.is_public);
          const publicRows = publicEvents.map(e => ({
            guest_id: payload.guest.id,
            event_id: e.id,
            is_attending: null,
            meal_choice: null,
            dietary_restrictions: null
          }));
          if (publicRows.length > 0) {
            const { error: err } = await supabase.from("guest_events").upsert(publicRows, { onConflict: "guest_id,event_id", ignoreDuplicates: true });
            if (err) throw err;
          }
        }
      } catch (e) {
        console.error("Error auto-linking public events on save API:", e);
      }

      // If guest is a +1, link to private events parent is linked to
      if (payload.guest.is_plus_one && payload.guest.parent_guest_id) {
        try {
          const { data: parentEvents } = await supabase
            .from("guest_events")
            .select("event_id")
            .eq("guest_id", payload.guest.parent_guest_id);
          if (parentEvents && parentEvents.length > 0) {
            const parentRows = parentEvents.map(pe => ({
              guest_id: payload.guest.id,
              event_id: pe.event_id,
              is_attending: null,
              meal_choice: null,
              dietary_restrictions: null
            }));
            const { error: err } = await supabase.from("guest_events").upsert(parentRows, { onConflict: "guest_id,event_id", ignoreDuplicates: true });
            if (err) throw err;
          }
        } catch (e) {
          console.error("Error auto-linking +1 parent events on save API:", e);
        }
      }
    } 
    else if (action === "deleteGuest") {
      // 1. Delete references in guest_groups
      { const { error } = await supabase.from("guest_groups").delete().eq("guest_id", payload.id); if (error) throw error; }
      // 2. Delete references in guest_events
      { const { error } = await supabase.from("guest_events").delete().eq("guest_id", payload.id); if (error) throw error; }
      // 3. Delete guest
      const { error } = await supabase.from("guests").delete().eq("id", payload.id);
      if (error) throw error;
    } 
    else if (action === "saveGroup") {
      const { error } = await supabase.from("groups").upsert({
        id: payload.group.id,
        name: payload.group.name
      });
      if (error) throw error;
    }
    else if (action === "saveEvent") {
      const { error } = await supabase.from("events").upsert({
        id: payload.event.id,
        title: payload.event.title,
        description: payload.event.description,
        date: payload.event.date,
        start_time: payload.event.start_time,
        end_time: payload.event.end_time,
        location: payload.event.location,
        dress_code: payload.event.dress_code,
        is_public: payload.event.is_public,
        group_id: payload.event.group_id
      });
      if (error) throw error;

      // Sync guest_events mapping
      try {
        if (payload.event.is_public) {
          const { data: guests } = await supabase.from("guests").select("id");
          if (guests && guests.length > 0) {
            const rows = guests.map(g => ({
              guest_id: g.id,
              event_id: payload.event.id,
              is_attending: null,
              meal_choice: null,
              dietary_restrictions: null
            }));
            const { error: err } = await supabase.from("guest_events").upsert(rows, { onConflict: "guest_id,event_id", ignoreDuplicates: true });
            if (err) throw err;
          }
        } else if (payload.event.group_id) {
          const { data: guestsInGroup } = await supabase
            .from("guest_groups")
            .select("guest_id")
            .eq("group_id", payload.event.group_id);
          if (guestsInGroup && guestsInGroup.length > 0) {
            const rows = guestsInGroup.map(gg => ({
              guest_id: gg.guest_id,
              event_id: payload.event.id,
              is_attending: null,
              meal_choice: null,
              dietary_restrictions: null
            }));
            const { error: err } = await supabase.from("guest_events").upsert(rows, { onConflict: "guest_id,event_id", ignoreDuplicates: true });
            if (err) throw err;
          }
        }
      } catch (e) {
        console.error("Error syncing guest events on saveEvent API:", e);
      }
    } 
    else if (action === "deleteEvent") {
      // 1. Delete references in guest_events
      { const { error } = await supabase.from("guest_events").delete().eq("event_id", payload.id); if (error) throw error; }
      // 2. Delete event
      const { error } = await supabase.from("events").delete().eq("id", payload.id);
      if (error) throw error;
    } 
    else if (action === "addGuestToGroup") {
      const { error } = await supabase.from("guest_groups").upsert({
        guest_id: payload.guest_id,
        group_id: payload.group_id
      }, { onConflict: "guest_id,group_id" });
      if (error) throw error;

      // Auto-link all events matching this group to this guest
      try {
        const { data: dbEvents } = await supabase
          .from("events")
          .select("id,group_id");
        
        if (dbEvents) {
          const groupEvents = dbEvents.filter(e => e.group_id === payload.group_id);
          const rows = groupEvents.map(e => ({
            guest_id: payload.guest_id,
            event_id: e.id,
            is_attending: null,
            meal_choice: null,
            dietary_restrictions: null
          }));
          if (rows.length > 0) {
            const { error: err } = await supabase.from("guest_events").upsert(rows, { onConflict: "guest_id,event_id", ignoreDuplicates: true });
            if (err) throw err;
          }
        }
      } catch (e) {
        console.error("Error auto-linking group events on API add:", e);
      }
    } 
    else if (action === "removeGuestFromGroup") {
      const { error } = await supabase
        .from("guest_groups")
        .delete()
        .eq("guest_id", payload.guest_id)
        .eq("group_id", payload.group_id);
      if (error) throw error;

      // Clean up corresponding guest_events link if not public
      try {
        const { data: dbEvents } = await supabase
          .from("events")
          .select("id,group_id");
          
        if (dbEvents) {
          const groupEvents = dbEvents.filter(e => e.group_id === payload.group_id);
          for (const e of groupEvents) {
            await supabase
              .from("guest_events")
              .delete()
              .eq("guest_id", payload.guest_id)
              .eq("event_id", e.id);
          }
        }
      } catch (e) {
        console.error("Error unlinking group events on API remove:", e);
      }
    } 
    else if (action === "importBackupJSON") {
      const parsed = payload?.parsed;
      const requiredTables = ['parties', 'guests', 'groups', 'events', 'guest_groups', 'guest_events'];
      if (!parsed || requiredTables.some(table => !Array.isArray(parsed[table])) || (parsed.site_configs !== undefined && !Array.isArray(parsed.site_configs))) {
        throw new ApiError('This backup is incomplete or invalid. No records were changed.', 400);
      }
      if (parsed.site_configs) parsed.site_configs = parsed.site_configs.filter((row: any) => typeof row.key === 'string' && !row.key.startsWith('backup_'));
      if (parsed.parties && parsed.guests) {
        { const { error } = await supabase.from("guest_events").delete().neq("event_id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
        { const { error } = await supabase.from("guest_groups").delete().neq("group_id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
        { const { error } = await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
        { const { error } = await supabase.from("groups").delete().neq("id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
        { const { error } = await supabase.from("guests").delete().neq("id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
        { const { error } = await supabase.from("parties").delete().neq("id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
        
        if (parsed.site_configs) {
          { const { error } = await supabase.from("site_configs").delete().not("key", "like", "backup_%"); if (error) throw error; }
        }

        if (parsed.parties.length > 0) {
          const { error } = await supabase.from("parties").insert(parsed.parties);
          if (error) throw error;
        }
        if (parsed.guests.length > 0) {
          const { error } = await supabase.from("guests").insert(parsed.guests);
          if (error) throw error;
        }
        if (parsed.groups && parsed.groups.length > 0) {
          const { error } = await supabase.from("groups").insert(parsed.groups);
          if (error) throw error;
        }
        if (parsed.events && parsed.events.length > 0) {
          const { error } = await supabase.from("events").insert(parsed.events);
          if (error) throw error;
        }
        if (parsed.guest_groups && parsed.guest_groups.length > 0) {
          const { error } = await supabase.from("guest_groups").insert(parsed.guest_groups);
          if (error) throw error;
        }
        if (parsed.guest_events && parsed.guest_events.length > 0) {
          const { error } = await supabase.from("guest_events").insert(parsed.guest_events);
          if (error) throw error;
        }
        if (parsed.site_configs && parsed.site_configs.length > 0) {
          const { error } = await supabase.from("site_configs").insert(parsed.site_configs);
          if (error) throw error;
        }
      }
    }
    else if (action === "resetToSeeds") {
      const { seedPayload: payload, seedUiConfigs } = await import("@/lib/databaseSeeds");
      // Clear database tables
      { const { error } = await supabase.from("guest_events").delete().neq("event_id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
      { const { error } = await supabase.from("guest_groups").delete().neq("group_id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
      { const { error } = await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
      { const { error } = await supabase.from("groups").delete().neq("id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
      { const { error } = await supabase.from("guests").delete().neq("id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }
      { const { error } = await supabase.from("parties").delete().neq("id", "00000000-0000-0000-0000-000000000000"); if (error) throw error; }

      // Insert seeds
      if (payload.parties && payload.parties.length > 0) {
        const { error } = await supabase.from("parties").insert(payload.parties);
        if (error) throw error;
      }
      if (payload.guests && payload.guests.length > 0) {
        const { error } = await supabase.from("guests").insert(payload.guests);
        if (error) throw error;
      }
      if (payload.groups && payload.groups.length > 0) {
        const { error } = await supabase.from("groups").insert(payload.groups);
        if (error) throw error;
      }
      if (payload.events && payload.events.length > 0) {
        const { error } = await supabase.from("events").insert(payload.events);
        if (error) throw error;
      }
      if (payload.guest_groups && payload.guest_groups.length > 0) {
        const { error } = await supabase.from("guest_groups").insert(payload.guest_groups);
        if (error) throw error;
      }
      if (payload.guest_events && payload.guest_events.length > 0) {
        const { error } = await supabase.from("guest_events").insert(payload.guest_events);
        if (error) throw error;
      }
      const { error: configError } = await supabase.from("site_configs").upsert(seedUiConfigs.map(config => ({ ...config, updated_at: new Date().toISOString() })));
      if (configError) throw configError;
    }
    else {
      return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to execute admin database mutation:", err);
    return apiFailure(err);
  }
}
