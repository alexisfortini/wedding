import "server-only";
import type { Party, Guest, GuestGroup, Group, Event, GuestEvent } from "./mockDatabase";
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

const seenSeedGuestIds = new Set<string>();

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
    if (!seenSeedGuestIds.has(guestId)) {
      seenSeedGuestIds.add(guestId);
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
    }

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


export const seedPayload = { parties: DEFAULT_PARTIES, guests: DEFAULT_GUESTS, groups: DEFAULT_GROUPS, events: DEFAULT_EVENTS, guest_groups: DEFAULT_GUEST_GROUPS, guest_events: DEFAULT_GUEST_EVENTS };
export const seedUiConfigs = [{key:"admin",value:adminConfig},{key:"dj_lineup",value:djConfig},{key:"faq",value:faqConfig},{key:"general",value:generalConfig},{key:"map",value:mapConfig},{key:"registry",value:registryConfig},{key:"story",value:storyConfig},{key:"travel",value:travelConfig},{key:"weekend",value:weekendConfig}];
