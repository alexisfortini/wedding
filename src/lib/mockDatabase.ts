"use client";

import guestsSeed from "@config/db/guests.json";
import groupsSeed from "@config/db/groups.json";
import eventsSeed from "@config/db/events.json";

import adminConfig from "@config/ui/admin.json";
import djConfig from "@config/ui/dj_lineup.json";
import faqConfig from "@config/ui/faq.json";
import generalConfig from "@config/ui/general.json";
import mapConfig from "@config/ui/map.json";
import registryConfig from "@config/ui/registry.json";
import storyConfig from "@config/ui/story.json";
import travelConfig from "@config/ui/travel.json";
import weekendConfig from "@config/ui/weekend.json";

import { supabase } from "./supabase";

// Types matching Supabase tables
export interface Party {
  id: string;
  name: string;
}

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  party_id: string | null;
  address: string | null;
  rsvp_status: string; // 'attending' | 'declined' | 'pending'
  notes: string | null;
  is_plus_one: boolean | null;
  parent_guest_id: string | null;
  plus_ones_allowed: number | null;
  age: string | null; // 'Adult' | 'Child' | 'Infant'
  needs_highchair: boolean | null;
  in_wheelchair: boolean | null;
}

export interface Group {
  id: string;
  name: string;
}

export interface GuestGroup {
  guest_id: string;
  group_id: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string | null;
  location: string;
  dress_code: string | null;
  is_public: boolean;
  group_id: string | null;
  needs_rsvp?: boolean;
}

export interface GuestEvent {
  guest_id: string;
  event_id: string;
  is_attending: boolean | null;
  meal_choice: string | null;
  dietary_restrictions: string | null;
}

// Helper to generate deterministic UUIDs
export function getDeterministicUUID(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = [];
  let currentSeed = Math.abs(hash);
  for (let i = 0; i < 32; i++) {
    currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
    hex.push((Math.floor(currentSeed / 65536) % 16).toString(16));
  }
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-a${s.slice(17, 20)}-${s.slice(20, 32)}`;
}

// Process Seed Data dynamically from JSON configurations
export const DEFAULT_PARTIES: Party[] = [];
export const DEFAULT_GUESTS: Guest[] = [];
export const DEFAULT_GUEST_GROUPS: GuestGroup[] = [];

const maleNames = new Set([
  "Alexis", "Bryce", "Carson", "Chris", "Christian", "Conner", "Connor", "David",
  "Dusan", "Frankie", "Garrett", "Graham", "Grant", "Herb", "Jack", "Jaime",
  "James", "Jameson", "Jeffrey", "Joe", "Johnny", "Jordan", "Joshua", "Kerry",
  "Kyle", "Lucas", "Luke", "Mark", "Matt", "Matthew", "Miles", "Neel", "Nicholas",
  "Nick", "Oliver", "Pete", "Randy", "Ryan", "Scott", "Thomas", "Tim", "Tom",
  "Zac", "Zach"
]);

guestsSeed.forEach((partyInfo: any) => {
  const isSinglePerson = partyInfo.guests && partyInfo.guests.length === 1;
  const partyId = isSinglePerson ? null : getDeterministicUUID("party-" + partyInfo.party_name);
  
  if (!isSinglePerson) {
    // Determine name based on head male or primary female guest
    let partyName = partyInfo.party_name;
    if (partyInfo.guests && partyInfo.guests.length > 0) {
      if (partyInfo.party_name === "Nadia Fortini & Siri Bryant") {
        partyName = "Fortini";
      } else {
        const householdGuests = partyInfo.guests.filter((g: any) => !g.is_plus_one);
        const males = householdGuests.filter((g: any) => maleNames.has(g.first_name));
        if (males.length > 0) {
          partyName = males[0].last_name;
        } else if (householdGuests.length > 0) {
          partyName = householdGuests[0].last_name;
        }
      }
    }

    DEFAULT_PARTIES.push({
      id: partyId!,
      name: partyName
    });
  }

  partyInfo.guests.forEach((guestInfo: any) => {
    const guestId = getDeterministicUUID(`guest-${guestInfo.first_name}-${guestInfo.last_name}`);
    DEFAULT_GUESTS.push({
      id: guestId,
      first_name: guestInfo.first_name,
      last_name: guestInfo.last_name,
      email: guestInfo.email || null,
      phone: guestInfo.phone || null,
      party_id: partyId,
      address: guestInfo.address || partyInfo.address || null,
      rsvp_status: "pending",
      notes: "",
      is_plus_one: guestInfo.is_plus_one || false,
      parent_guest_id: guestInfo.parent_guest_id || null,
      plus_ones_allowed: guestInfo.plus_ones_allowed || 0,
      age: guestInfo.age || "Adult",
      needs_highchair: guestInfo.needs_highchair || false,
      in_wheelchair: guestInfo.in_wheelchair || false
    });

    if (guestInfo.groups && Array.isArray(guestInfo.groups)) {
      guestInfo.groups.forEach((groupName: string) => {
        const groupId = getDeterministicUUID("group-" + groupName);
        DEFAULT_GUEST_GROUPS.push({
          guest_id: guestId,
          group_id: groupId
        });
      });
    }
  });
});

export const DEFAULT_GROUPS: Group[] = groupsSeed.map((name: string) => ({
  id: getDeterministicUUID("group-" + name),
  name
}));

export const DEFAULT_EVENTS: Event[] = eventsSeed.map((eventInfo: any) => {
  const eventId = getDeterministicUUID("event-" + eventInfo.title);
  const groupId = eventInfo.group ? getDeterministicUUID("group-" + eventInfo.group) : null;
  return {
    id: eventId,
    title: eventInfo.title,
    description: eventInfo.description || null,
    date: eventInfo.date,
    start_time: eventInfo.start_time,
    end_time: eventInfo.end_time || null,
    location: eventInfo.location,
    dress_code: eventInfo.dress_code || null,
    is_public: eventInfo.is_public !== false,
    group_id: groupId,
    needs_rsvp: eventInfo.needs_rsvp !== false
  };
});

export const DEFAULT_GUEST_EVENTS: GuestEvent[] = [];

DEFAULT_GUESTS.forEach(g => {
  DEFAULT_EVENTS.forEach(e => {
    if (e.is_public) {
      DEFAULT_GUEST_EVENTS.push({
        guest_id: g.id,
        event_id: e.id,
        is_attending: null,
        meal_choice: null,
        dietary_restrictions: null
      });
    } else if (e.group_id) {
      const isInGroup = DEFAULT_GUEST_GROUPS.some(gg => gg.guest_id === g.id && gg.group_id === e.group_id);
      if (isInGroup) {
        DEFAULT_GUEST_EVENTS.push({
          guest_id: g.id,
          event_id: e.id,
          is_attending: null,
          meal_choice: null,
          dietary_restrictions: null
        });
      }
    }
  });
});

// Database implementation using Supabase directly as the single source of truth
export const mockDatabase = {
  getParties: async (): Promise<Party[]> => {
    const { data, error } = await supabase.from("parties").select("*").order("name");
    if (error) throw error;
    return data || [];
  },
  saveParty: async (party: Party): Promise<void> => {
    const { error } = await supabase.from("parties").upsert({
      id: party.id,
      name: party.name
    });
    if (error) throw error;
  },
  deleteParty: async (id: string): Promise<void> => {
    const { error } = await supabase.from("parties").delete().eq("id", id);
    if (error) throw error;
  },

  getGuests: async (): Promise<Guest[]> => {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });
    if (error) throw error;
    return data || [];
  },
  saveGuest: async (guest: Guest): Promise<void> => {
    const { error } = await supabase.from("guests").upsert({
      id: guest.id,
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email,
      phone: guest.phone,
      party_id: guest.party_id,
      address: guest.address,
      rsvp_status: guest.rsvp_status,
      notes: guest.notes,
      is_plus_one: guest.is_plus_one,
      parent_guest_id: guest.parent_guest_id,
      plus_ones_allowed: guest.plus_ones_allowed,
      age: guest.age,
      needs_highchair: guest.needs_highchair,
      in_wheelchair: guest.in_wheelchair
    });
    if (error) throw error;

    // Link events mapping for all public events on save
    try {
      const dbEvents = await mockDatabase.getEvents();
      const publicEvents = dbEvents.filter(e => e.is_public);
      for (const e of publicEvents) {
        await mockDatabase.linkGuestEvent(guest.id, e.id);
      }
    } catch (e) {
      console.error("Error auto-linking public events on save:", e);
    }

    // If guest is a +1, link to private events parent is linked to
    if (guest.is_plus_one && guest.parent_guest_id) {
      const parentEvents = (await mockDatabase.getGuestEvents()).filter(ge => ge.guest_id === guest.parent_guest_id);
      for (const pe of parentEvents) {
        await mockDatabase.linkGuestEvent(guest.id, pe.event_id);
      }
    }
  },
  deleteGuest: async (id: string): Promise<void> => {
    const { error } = await supabase.from("guests").delete().eq("id", id);
    if (error) throw error;
  },

  getGroups: async (): Promise<Group[]> => {
    const { data, error } = await supabase.from("groups").select("*").order("name");
    if (error) throw error;
    if (!data || data.length === 0) {
      return DEFAULT_GROUPS;
    }
    return data || [];
  },
  saveGroup: async (group: Group): Promise<void> => {
    const { error } = await supabase.from("groups").upsert({
      id: group.id,
      name: group.name
    });
    if (error) throw error;
  },

  getGuestGroups: async (): Promise<GuestGroup[]> => {
    const { data, error } = await supabase.from("guest_groups").select("*");
    if (error) throw error;
    return data || [];
  },
  addGuestToGroup: async (guest_id: string, group_id: string): Promise<void> => {
    const { error } = await supabase.from("guest_groups").insert({ guest_id, group_id });
    if (error) throw error;

    // Auto-link all events matching this group to this guest
    try {
      const dbEvents = await mockDatabase.getEvents();
      const groupEvents = dbEvents.filter(e => e.group_id === group_id);
      for (const e of groupEvents) {
        await mockDatabase.linkGuestEvent(guest_id, e.id);
      }
    } catch (e) {
      console.error("Error auto-linking group events on add:", e);
    }
  },
  removeGuestFromGroup: async (guest_id: string, group_id: string): Promise<void> => {
    const { error } = await supabase.from("guest_groups").delete().eq("guest_id", guest_id).eq("group_id", group_id);
    if (error) throw error;

    // Clean up corresponding guest_events link if not public
    try {
      const dbEvents = await mockDatabase.getEvents();
      const groupEvents = dbEvents.filter(e => e.group_id === group_id);
      for (const e of groupEvents) {
        await mockDatabase.unlinkGuestEvent(guest_id, e.id);
      }
    } catch (e) {
      console.error("Error unlinking group events on remove:", e);
    }
  },

  getEvents: async (): Promise<Event[]> => {
    const { data, error } = await supabase.from("events").select("*").order("date").order("start_time");
    if (error) throw error;
    return data || [];
  },
  saveEvent: async (event: Event): Promise<void> => {
    const { error } = await supabase.from("events").upsert({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      dress_code: event.dress_code,
      is_public: event.is_public,
      group_id: event.group_id,
      needs_rsvp: event.needs_rsvp !== false
    });
    if (error) throw error;

    // Sync guest_events mapping
    if (event.is_public) {
      const guests = await mockDatabase.getGuests();
      for (const g of guests) {
        await mockDatabase.linkGuestEvent(g.id, event.id);
      }
    } else if (event.group_id) {
      const guestsInGroup = (await mockDatabase.getGuestGroups())
        .filter(gg => gg.group_id === event.group_id)
        .map(gg => gg.guest_id);
      for (const gId of guestsInGroup) {
        await mockDatabase.linkGuestEvent(gId, event.id);
      }
    }
  },
  deleteEvent: async (id: string): Promise<void> => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
  },

  getGuestEvents: async (): Promise<GuestEvent[]> => {
    const { data, error } = await supabase.from("guest_events").select("*");
    if (error) throw error;
    return data || [];
  },
  linkGuestEvent: async (guest_id: string, event_id: string): Promise<void> => {
    const { error } = await supabase.from("guest_events").upsert({
      guest_id,
      event_id,
      is_attending: null,
      meal_choice: null,
      dietary_restrictions: null
    }, { onConflict: "guest_id,event_id" });
    if (error) throw error;
  },
  unlinkGuestEvent: async (guest_id: string, event_id: string): Promise<void> => {
    const { error } = await supabase.from("guest_events").delete().eq("guest_id", guest_id).eq("event_id", event_id);
    if (error) throw error;
  },
  updateGuestEventRSVP: async (guest_id: string, event_id: string, is_attending: boolean, meal_choice: string | null, dietary_restrictions: string | null): Promise<void> => {
    const { error } = await supabase.from("guest_events").upsert({
      guest_id,
      event_id,
      is_attending,
      meal_choice,
      dietary_restrictions
    }, { onConflict: "guest_id,event_id" });
    if (error) throw error;

    const { error: guestError } = await supabase.from("guests").update({
      rsvp_status: is_attending ? "attending" : "declined"
    }).eq("id", guest_id);
    if (guestError) throw guestError;
    mockDatabase.createBackup(`Update RSVP (guest ID: ${guest_id})`).catch(() => {});
  },

  // Lookup guest by name (Case-insensitive)
  findGuestByName: async (firstName: string, lastName: string) => {
    const { data, error } = await supabase
      .from("guests")
      .select(`
        *,
        parties (name)
      `)
      .ilike("first_name", firstName.trim())
      .ilike("last_name", lastName.trim())
      .maybeSingle();
    if (error) throw error;
    
    if (data) {
      return {
        ...data,
        parties: data.parties ? { name: (data.parties as any).name } : null
      };
    }
    return null;
  },

  // Database backup control via Supabase site_configs table
  getBackups: async (): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from("site_configs")
        .select("key, value, updated_at")
        .like("key", "backup_%")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(item => ({
        id: item.key,
        timestamp: item.updated_at,
        action: item.value?.action || "Backup",
        data: item.value?.data
      }));
    } catch (e) {
      console.warn("Failed to fetch backups:", e);
      return [];
    }
  },

  createBackup: async (actionName: string): Promise<boolean> => {
    try {
      const backupData = await mockDatabase.exportDatabaseJSON();
      const backupId = `backup_${Date.now()}`;
      
      const res = await fetch("/api/save-site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: backupId,
          value: {
            action: actionName,
            data: JSON.parse(backupData)
          }
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      await mockDatabase.pruneBackups();
      return true;
    } catch (e) {
      console.error("Failed to create backup:", e);
      return false;
    }
  },

  pruneBackups: async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("site_configs")
        .select("key")
        .like("key", "backup_%")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      if (data && data.length > 50) {
        const keysToDelete = data.slice(50).map(item => item.key);
        const res = await fetch("/api/save-site-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            keys: keysToDelete
          })
        });
        const resData = await res.json();
        if (!resData.success) throw new Error(resData.error);
      }
    } catch (e) {
      console.warn("Failed to prune backups:", e);
    }
  },

  restoreBackup: async (backupId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("site_configs")
        .select("value")
        .eq("key", backupId)
        .single();
      if (error || !data) throw error || new Error("Backup not found");
      const backupDataStr = JSON.stringify(data.value.data);
      return await mockDatabase.importBackupJSON(backupDataStr);
    } catch (e) {
      console.error("Failed to restore backup:", e);
      return false;
    }
  },
  
  importBackupJSON: async (jsonStr: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonStr);
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
        return true;
      }
    } catch (e) {
      console.error("Supabase bulk JSON import failed:", e);
    }
    return false;
  },

  exportDatabaseJSON: async (): Promise<string> => {
    const getSiteConfigs = async () => {
      try {
        return await supabase.from("site_configs").select("*");
      } catch (e) {
        return { data: [] };
      }
    };
    const [parties, guests, groups, guestGroups, events, guestEvents, siteConfigsRes] = await Promise.all([
      mockDatabase.getParties(),
      mockDatabase.getGuests(),
      mockDatabase.getGroups(),
      mockDatabase.getGuestGroups(),
      mockDatabase.getEvents(),
      mockDatabase.getGuestEvents(),
      getSiteConfigs()
    ]);
    const site_configs = siteConfigsRes.data || [];
    return JSON.stringify({
      parties,
      guests,
      groups,
      guest_groups: guestGroups,
      events,
      guest_events: guestEvents,
      site_configs
    }, null, 2);
  },

  getSiteConfig: async (key: string, localFallback: any): Promise<any> => {
    try {
      const res = await fetch(`/api/get-site-config?key=${encodeURIComponent(key)}`);
      if (!res.ok) {
        return localFallback;
      }
      const data = await res.json();
      if (data.success && data.value !== undefined && data.value !== null) {
        return data.value;
      }
      return localFallback;
    } catch (e) {
      console.warn(`Failed to fetch site config for '${key}':`, e);
      return localFallback;
    }
  },

  saveSiteConfig: async (key: string, value: any): Promise<void> => {
    const res = await fetch("/api/save-site-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to save configuration");
    }
  },

  resetToSeeds: async (): Promise<void> => {
    // 1. Clear database tables
    await supabase.from("guest_events").delete().neq("event_id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("guest_groups").delete().neq("group_id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("groups").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("guests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("parties").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 2. Insert seed tables
    if (DEFAULT_PARTIES.length > 0) {
      const { error } = await supabase.from("parties").insert(DEFAULT_PARTIES);
      if (error) throw error;
    }
    if (DEFAULT_GUESTS.length > 0) {
      const { error } = await supabase.from("guests").insert(DEFAULT_GUESTS);
      if (error) throw error;
    }
    if (DEFAULT_GROUPS.length > 0) {
      const { error } = await supabase.from("groups").insert(DEFAULT_GROUPS);
      if (error) throw error;
    }
    if (DEFAULT_EVENTS.length > 0) {
      const { error } = await supabase.from("events").insert(DEFAULT_EVENTS);
      if (error) throw error;
    }
    if (DEFAULT_GUEST_GROUPS.length > 0) {
      const { error } = await supabase.from("guest_groups").insert(DEFAULT_GUEST_GROUPS);
      if (error) throw error;
    }
    if (DEFAULT_GUEST_EVENTS.length > 0) {
      const { error } = await supabase.from("guest_events").insert(DEFAULT_GUEST_EVENTS);
      if (error) throw error;
    }

    // 3. Sync local UI configurations to site_configs table in Supabase
    try {
      const uiConfigs = [
        { key: "admin", value: adminConfig },
        { key: "dj_lineup", value: djConfig },
        { key: "faq", value: faqConfig },
        { key: "general", value: generalConfig },
        { key: "map", value: mapConfig },
        { key: "registry", value: registryConfig },
        { key: "story", value: storyConfig },
        { key: "travel", value: travelConfig },
        { key: "weekend", value: weekendConfig }
      ];

      for (const config of uiConfigs) {
        await mockDatabase.saveSiteConfig(config.key, config.value);
      }
    } catch (configError) {
      console.warn("Failed to sync UI configs to site_configs table (table might not exist yet):", configError);
    }
  }
};
