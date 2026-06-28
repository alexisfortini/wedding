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

// Helper for secure admin write mutations to bypass RLS policies
async function adminDbWrite(action: string, payload: any): Promise<any> {
  const passcode = typeof window !== "undefined" ? sessionStorage.getItem("wedding_admin_passcode") || "" : "";
  const res = await fetch("/api/admin-db", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-passcode": passcode
    },
    body: JSON.stringify({ action, payload })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || `Failed to execute administrative write: ${action}`);
  }
  return data.data;
}

// Database implementation using Supabase directly as the single source of truth
export const mockDatabase = {
  getParties: async (): Promise<Party[]> => {
    const { data, error } = await supabase.from("parties").select("*").order("name");
    if (error) throw error;
    return data || [];
  },
  saveParty: async (party: Party): Promise<void> => {
    await adminDbWrite("saveParty", { party });
  },
  deleteParty: async (id: string): Promise<void> => {
    await adminDbWrite("deleteParty", { id });
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
    await adminDbWrite("saveGuest", { guest });
  },
  deleteGuest: async (id: string): Promise<void> => {
    await adminDbWrite("deleteGuest", { id });
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
    await adminDbWrite("saveGroup", { group });
  },

  getGuestGroups: async (): Promise<GuestGroup[]> => {
    const { data, error } = await supabase.from("guest_groups").select("*");
    if (error) throw error;
    return data || [];
  },
  addGuestToGroup: async (guest_id: string, group_id: string): Promise<void> => {
    await adminDbWrite("addGuestToGroup", { guest_id, group_id });
  },
  removeGuestFromGroup: async (guest_id: string, group_id: string): Promise<void> => {
    await adminDbWrite("removeGuestFromGroup", { guest_id, group_id });
  },

  getEvents: async (): Promise<Event[]> => {
    const { data, error } = await supabase.from("events").select("*").order("date").order("start_time");
    if (error) throw error;
    return data || [];
  },
  saveEvent: async (event: Event): Promise<void> => {
    await adminDbWrite("saveEvent", { event });
  },
  deleteEvent: async (id: string): Promise<void> => {
    await adminDbWrite("deleteEvent", { id });
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
      
      const passcode = typeof window !== "undefined" ? sessionStorage.getItem("wedding_admin_passcode") || "" : "";
      const res = await fetch("/api/save-site-config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-passcode": passcode
        },
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
        const passcode = typeof window !== "undefined" ? sessionStorage.getItem("wedding_admin_passcode") || "" : "";
        const res = await fetch("/api/save-site-config", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-admin-passcode": passcode
          },
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
      await adminDbWrite("importBackupJSON", { parsed });
      return true;
    } catch (e) {
      console.error("Supabase bulk JSON import failed:", e);
      return false;
    }
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
    const passcode = typeof window !== "undefined" ? sessionStorage.getItem("wedding_admin_passcode") || "" : "";
    const res = await fetch("/api/save-site-config", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-admin-passcode": passcode
      },
      body: JSON.stringify({ key, value })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to save configuration");
    }
  },

  resetToSeeds: async (): Promise<void> => {
    const payload = {
      parties: DEFAULT_PARTIES,
      guests: DEFAULT_GUESTS,
      groups: DEFAULT_GROUPS,
      events: DEFAULT_EVENTS,
      guest_groups: DEFAULT_GUEST_GROUPS,
      guest_events: DEFAULT_GUEST_EVENTS
    };
    await adminDbWrite("resetToSeeds", payload);

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
