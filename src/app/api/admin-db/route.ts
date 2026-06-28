import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const passcodeHeader = req.headers.get("x-admin-passcode");
    const { action, payload } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials missing from environment.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin passcode before allowing any database writes
    const { data: adminConfigRow } = await supabase
      .from("site_configs")
      .select("value")
      .eq("key", "admin")
      .single();
    
    const correctPasscode = adminConfigRow?.value?.passcode || "indio2027";

    if (!passcodeHeader || passcodeHeader !== correctPasscode) {
      return NextResponse.json({ success: false, error: "Unauthorized: Invalid admin passcode" }, { status: 401 });
    }

    if (action === "saveParty") {
      const { error } = await supabase.from("parties").upsert({
        id: payload.party.id,
        name: payload.party.name
      });
      if (error) throw error;
    } 
    else if (action === "deleteParty") {
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
          for (const e of publicEvents) {
            await supabase.from("guest_events").upsert({
              guest_id: payload.guest.id,
              event_id: e.id,
              is_attending: null,
              meal_choice: null,
              dietary_restrictions: null
            }, { onConflict: "guest_id,event_id" });
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
          if (parentEvents) {
            for (const pe of parentEvents) {
              await supabase.from("guest_events").upsert({
                guest_id: payload.guest.id,
                event_id: pe.event_id,
                is_attending: null,
                meal_choice: null,
                dietary_restrictions: null
              }, { onConflict: "guest_id,event_id" });
            }
          }
        } catch (e) {
          console.error("Error auto-linking +1 parent events on save API:", e);
        }
      }
    } 
    else if (action === "deleteGuest") {
      // 1. Delete references in guest_groups
      await supabase.from("guest_groups").delete().eq("guest_id", payload.id);
      // 2. Delete references in guest_events
      await supabase.from("guest_events").delete().eq("guest_id", payload.id);
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
          if (guests) {
            for (const g of guests) {
              await supabase.from("guest_events").upsert({
                guest_id: g.id,
                event_id: payload.event.id,
                is_attending: null,
                meal_choice: null,
                dietary_restrictions: null
              }, { onConflict: "guest_id,event_id" });
            }
          }
        } else if (payload.event.group_id) {
          const { data: guestsInGroup } = await supabase
            .from("guest_groups")
            .select("guest_id")
            .eq("group_id", payload.event.group_id);
          if (guestsInGroup) {
            for (const gg of guestsInGroup) {
              await supabase.from("guest_events").upsert({
                guest_id: gg.guest_id,
                event_id: payload.event.id,
                is_attending: null,
                meal_choice: null,
                dietary_restrictions: null
              }, { onConflict: "guest_id,event_id" });
            }
          }
        }
      } catch (e) {
        console.error("Error syncing guest events on saveEvent API:", e);
      }
    } 
    else if (action === "deleteEvent") {
      // 1. Delete references in guest_events
      await supabase.from("guest_events").delete().eq("event_id", payload.id);
      // 2. Delete event
      const { error } = await supabase.from("events").delete().eq("id", payload.id);
      if (error) throw error;
    } 
    else if (action === "addGuestToGroup") {
      const { error } = await supabase.from("guest_groups").insert({
        guest_id: payload.guest_id,
        group_id: payload.group_id
      });
      if (error) throw error;

      // Auto-link all events matching this group to this guest
      try {
        const { data: dbEvents } = await supabase
          .from("events")
          .select("id,group_id");
        
        if (dbEvents) {
          const groupEvents = dbEvents.filter(e => e.group_id === payload.group_id);
          for (const e of groupEvents) {
            await supabase.from("guest_events").upsert({
              guest_id: payload.guest_id,
              event_id: e.id,
              is_attending: null,
              meal_choice: null,
              dietary_restrictions: null
            }, { onConflict: "guest_id,event_id" });
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
      const parsed = payload.parsed;
      if (parsed.parties && parsed.guests) {
        await supabase.from("guest_events").delete().neq("event_id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("guest_groups").delete().neq("group_id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("groups").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("guests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("parties").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        
        if (parsed.site_configs) {
          await supabase.from("site_configs").delete().neq("key", "00000000-0000-0000-0000-000000000000");
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
      // Clear database tables
      await supabase.from("guest_events").delete().neq("event_id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("guest_groups").delete().neq("group_id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("groups").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("guests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("parties").delete().neq("id", "00000000-0000-0000-0000-000000000000");

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
    }
    else {
      return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to execute admin database mutation:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
