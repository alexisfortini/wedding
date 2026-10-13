"use client";

import { supabase } from "./supabase";
import { lookupGuest } from "./guestLookup";

// Types matching Supabase tables
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

const configRequests = new Map<string, Promise<any>>();

// Helper for secure admin write mutations to bypass RLS policies
async function adminDbWrite(action: string, payload: any): Promise<any> {
  const passcode = typeof window !== "undefined" ? sessionStorage.getItem("wedding_admin_passcode") || "" : "";
  const res = await fetch("/api/admin-db", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-passcode": passcode
    },
    body: JSON.stringify({ action, payload }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || `Failed to execute administrative write: ${action}`);
  }
  return data.data;
}

async function readTable<T>(table: string, columns: string[]): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from(table).select('*');
    for (const column of columns) query = query.order(column);
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw new Error('Unable to load the current ' + table.replaceAll('_', ' ') + '. Please try again.');
    rows.push(...(data ?? []) as T[]);
    if (!data || data.length < 1000) return rows;
  }
}

// Database implementation using Supabase directly as the single source of truth
export const mockDatabase = {
  getParties: async (): Promise<Party[]> => readTable<Party>("parties", ["name","id"]),
  saveParty: async (party: Party): Promise<void> => {
    await adminDbWrite("saveParty", { party });
  },
  deleteParty: async (id: string): Promise<void> => {
    await adminDbWrite("deleteParty", { id });
  },

  getGuests: async (): Promise<Guest[]> => readTable<Guest>("guests", ["last_name","first_name","id"]),
  saveGuest: async (guest: Guest): Promise<void> => {
    await adminDbWrite("saveGuest", { guest });
  },
  deleteGuest: async (id: string): Promise<void> => {
    await adminDbWrite("deleteGuest", { id });
  },

  getGroups: async (): Promise<Group[]> => readTable<Group>("groups", ["name","id"]),
  saveGroup: async (group: Group): Promise<void> => {
    await adminDbWrite("saveGroup", { group });
  },

  getGuestGroups: async (): Promise<GuestGroup[]> => readTable<GuestGroup>("guest_groups", ["guest_id","group_id"]),
  addGuestToGroup: async (guest_id: string, group_id: string): Promise<void> => {
    await adminDbWrite("addGuestToGroup", { guest_id, group_id });
  },
  removeGuestFromGroup: async (guest_id: string, group_id: string): Promise<void> => {
    await adminDbWrite("removeGuestFromGroup", { guest_id, group_id });
  },

  getEvents: async (): Promise<Event[]> => readTable<Event>("events", ["date","start_time","id"]),
  saveEvent: async (event: Event): Promise<void> => {
    await adminDbWrite("saveEvent", { event });
  },
  deleteEvent: async (id: string): Promise<void> => {
    await adminDbWrite("deleteEvent", { id });
  },

  getGuestEvents: async (): Promise<GuestEvent[]> => readTable<GuestEvent>("guest_events", ["guest_id","event_id"]),
  linkGuestEvent: async (guest_id: string, event_id: string): Promise<void> => {
    const { error } = await supabase.from("guest_events").upsert({
      guest_id,
      event_id,
      is_attending: null,
      meal_choice: null,
      dietary_restrictions: null
    }, { onConflict: "guest_id,event_id", ignoreDuplicates: true });
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

  findGuestByName: async (firstName: string, lastName: string) => lookupGuest({ firstName, lastName }),

  // Database backup control via Supabase site_configs table
  getBackups: async (): Promise<any[]> => adminDbWrite("getBackups", {}),

  createBackup: async (actionName: string): Promise<boolean> => {
    if (typeof window === "undefined" || !sessionStorage.getItem("wedding_admin_passcode")) return false;
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

  pruneBackups: async (): Promise<void> => { await adminDbWrite("pruneBackups", {}); },

  restoreBackup: async (backupId: string): Promise<boolean> => {
    try {
      const value = await mockDatabase.getSiteConfig(backupId, null);
      if (!value?.data) throw new Error("Backup unavailable");
      const backupDataStr = JSON.stringify(value.data);
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

  exportDatabaseJSON: async (): Promise<string> => JSON.stringify(await adminDbWrite("exportDatabaseJSON", {}), null, 2),

  getSiteConfig: async (key: string, localFallback: any, strict = false): Promise<any> => {
    const passcode = typeof window !== "undefined" ? sessionStorage.getItem("wedding_admin_passcode") || "" : "";
    const requestKey = key + (passcode ? ":admin:" + passcode : ":public");
    let request = configRequests.get(requestKey);
    if (!request) {
      request = fetch(`/api/get-site-config?key=${encodeURIComponent(key)}`, {
        headers: passcode ? { "x-admin-passcode": passcode } : {},
        cache: "no-store", signal: AbortSignal.timeout(15000),
      }).then(async res => {
        if (!res.ok) throw new Error("Configuration unavailable");
        const data = await res.json();
        if (!data.success) throw new Error("Configuration unavailable");
        return data.value;
      }).finally(() => configRequests.delete(requestKey));
      configRequests.set(requestKey, request);
    }
    try { return await request ?? localFallback; }
    catch (error) { if (strict) throw error; return localFallback; }
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

  getFundContributions: async (): Promise<{ contributions: FundContribution[]; totalRaised: number; targetAmount: number; initialRaised: number }> => {
    const passcode = typeof window !== "undefined" ? sessionStorage.getItem("wedding_admin_passcode") || "" : "";
    const res = await fetch("/api/fund-contributions", { headers: passcode ? { "x-admin-passcode": passcode } : {}, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "Gift totals are temporarily unavailable.");
    return { contributions: data.contributions ?? [], totalRaised: data.totalRaised, targetAmount: data.targetAmount, initialRaised: data.initialRaised };
  },

  addFundContribution: async (contribution: { id?: string; guestName: string; amount: number; paymentMethod: 'venmo' | 'zelle' | 'cash'; note?: string }): Promise<FundContribution> => {
    const res = await fetch("/api/fund-contributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contribution)
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to submit contribution");
    }
    return data.contribution;
  },

  updateFundContribution: async (id: string, updates: Partial<FundContribution>): Promise<void> => {
    const passcode = typeof window !== "undefined" ? sessionStorage.getItem("wedding_admin_passcode") || "" : "";
    const res = await fetch("/api/fund-contributions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-passcode": passcode
      },
      body: JSON.stringify({ id, ...updates })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to update contribution");
    }
  },

  deleteFundContribution: async (id: string): Promise<void> => {
    const passcode = typeof window !== "undefined" ? sessionStorage.getItem("wedding_admin_passcode") || "" : "";
    const res = await fetch("/api/fund-contributions", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-passcode": passcode
      },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to delete contribution");
    }
  },

  resetToSeeds: async (): Promise<void> => {
    await adminDbWrite("resetToSeeds", {});
  }
};
