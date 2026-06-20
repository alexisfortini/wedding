import { Guest, Party, Group, GuestGroup, GuestEvent, Event } from "./mockDatabase";

export interface AislePlannerRow {
  "RSVP ID": string;
  "Title": string;
  "First Name": string;
  "Last Name": string;
  "Suffix": string;
  "Role": string;
  "Formal Addressing": string;
  "Address": string;
  "Phone Number": string;
  "Email Address": string;
  "Age": string;
  "Gender": string;
  "List": string;
  "Response": string;
  "Needs Highchair": string;
  "In a Wheelchair": string;
  "Out of Town": string;
  "Guest Group": string;
  "Table Assignment": string;
  "Seat #": string;
  "Notes": string;
}

/**
 * Maps wedding guest records directly to the Aisle Planner guest import schema.
 * Handles anonymous plus-ones, maps logistics, and consolidates notes.
 * Supports individual (flat list) or grouped (empty row separator between parties) styles.
 */
export function exportToAislePlanner(
  guests: Guest[],
  parties: Party[],
  groups: Group[],
  guestGroups: GuestGroup[],
  guestEvents: GuestEvent[],
  events: Event[],
  layout: "individual" | "grouped" = "individual",
  mealsConfig?: any
): (AislePlannerRow | null)[] {
  // Helper function to map a single guest to an Aisle Planner row
  const mapGuest = (g: Guest): AislePlannerRow => {
    // 1. Calculate RSVP ID
    const rsvpId = g.party_id 
      ? g.party_id.substring(0, 8).toUpperCase() 
      : `G-${g.id.substring(0, 6).toUpperCase()}`;

    // 2. Plus-One Edge Case Handling (Sanitize name)
    let firstName = (g.first_name || "").trim();
    let lastName = (g.last_name || "").trim();
    const isNameAnonymous = 
      !firstName || 
      !lastName || 
      firstName.includes("+1") || 
      firstName.toLowerCase().includes("guest") || 
      lastName.includes("+1") || 
      lastName.toLowerCase().includes("guest");

    if (g.is_plus_one && isNameAnonymous) {
      firstName = "Guest";
      const parentGuest = guests.find(p => p.id === g.parent_guest_id);
      lastName = parentGuest ? (parentGuest.last_name || "").trim() : "One";
    }

    // 3. Map Groups
    const mappedGroups = guestGroups
      .filter(gg => gg.guest_id === g.id)
      .map(gg => groups.find(gr => gr.id === gg.group_id)?.name)
      .filter(Boolean)
      .join(", ");

    // 4. Map Response Status
    let displayResponse = "Pending";
    if (g.rsvp_status === "attending") displayResponse = "Accepted";
    else if (g.rsvp_status === "declined") displayResponse = "Declined";

    // 5. Gather meal selection and dietary restrictions from guest events for Ceremony/Reception
    const ceremonyEvent = events.find(e => e.title.toLowerCase().includes("ceremony"));
    const ceremonyRSVP = ceremonyEvent ? guestEvents.find(
      ge => ge.guest_id === g.id && ge.event_id === ceremonyEvent.id
    ) : undefined;

    // 6. Consolidate Notes
    const notesParts: string[] = [];
    if (g.notes && g.notes.trim()) {
      notesParts.push(g.notes.trim());
    }
    if (ceremonyRSVP) {
      if (ceremonyRSVP.meal_choice) {
        let displayMeal = ceremonyRSVP.meal_choice;
        const mealsList = mealsConfig && (Array.isArray(mealsConfig) ? mealsConfig : mealsConfig.list);
        if (mealsList && Array.isArray(mealsList)) {
          const matched = mealsList.find((m: any) => m.key === ceremonyRSVP.meal_choice);
          if (matched) displayMeal = matched.label;
        } else {
          if (ceremonyRSVP.meal_choice === "beef") displayMeal = "Braised Short Rib";
          else if (ceremonyRSVP.meal_choice === "fish") displayMeal = "Seared Halibut";
          else if (ceremonyRSVP.meal_choice === "veg") displayMeal = "Roasted King Oyster Mushroom";
        }
        notesParts.push(`Meal: ${displayMeal}`);
      }
      if (ceremonyRSVP.dietary_restrictions && ceremonyRSVP.dietary_restrictions.trim()) {
        notesParts.push(`Dietary: ${ceremonyRSVP.dietary_restrictions.trim()}`);
      }
    }

    return {
      "RSVP ID": rsvpId,
      "Title": "",
      "First Name": firstName,
      "Last Name": lastName,
      "Suffix": "",
      "Role": "",
      "Formal Addressing": "",
      "Address": g.address || "",
      "Phone Number": g.phone || "",
      "Email Address": g.email || "",
      "Age": g.age || "Adult",
      "Gender": "",
      "List": "List A",
      "Response": displayResponse,
      "Needs Highchair": g.needs_highchair ? "Yes" : "No",
      "In a Wheelchair": g.in_wheelchair ? "Yes" : "No",
      "Out of Town": "No",
      "Guest Group": mappedGroups,
      "Table Assignment": "",
      "Seat #": "",
      "Notes": notesParts.join(" | ")
    };
  };

  if (layout === "individual") {
    // Sort all guests alphabetically by Last Name, then First Name
    const sortedGuests = [...guests].sort((a, b) => 
      a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
    );
    return sortedGuests.map(g => mapGuest(g));
  } else {
    // Grouped layout: Group by party, sort parties alphabetically by name, put blank row between parties
    const partyIdToName = new Map(parties.map(p => [p.id, p.name]));
    
    // Find unique party IDs present in the guests list
    const activePartyIds = Array.from(new Set(guests.map(g => g.party_id).filter(Boolean))) as string[];
    
    // Sort party IDs alphabetically by party name
    activePartyIds.sort((a, b) => {
      const nameA = partyIdToName.get(a) || "";
      const nameB = partyIdToName.get(b) || "";
      return nameA.localeCompare(nameB);
    });
    
    const noPartyGuests = guests.filter(g => !g.party_id);
    const resultRows: (AislePlannerRow | null)[] = [];
    
    // Process each party group
    activePartyIds.forEach((pId, idx) => {
      const partyGuests = guests.filter(g => g.party_id === pId);
      // Sort guests within the party alphabetically
      partyGuests.sort((a, b) => 
        a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
      );
      
      partyGuests.forEach(g => {
        resultRows.push(mapGuest(g));
      });
      
      // Append blank row separator if there are more parties or individual guests coming up
      if (idx < activePartyIds.length - 1 || noPartyGuests.length > 0) {
        resultRows.push(null);
      }
    });
    
    // Add guests that do not belong to any party, each separated by a blank row
    noPartyGuests.forEach((g, idx) => {
      resultRows.push(mapGuest(g));
      if (idx < noPartyGuests.length - 1) {
        resultRows.push(null);
      }
    });
    
    return resultRows;
  }
}

/**
 * Converts Aisle Planner rows directly to a CSV string
 */
export function convertToAislePlannerCSV(rows: (AislePlannerRow | null)[]): string {
  const headers = [
    "RSVP ID", "Title", "First Name", "Last Name", "Suffix", "Role", 
    "Formal Addressing", "Address", "Phone Number", "Email Address",
    "Age", "Gender", "List", "Response", "Needs Highchair", "In a Wheelchair", 
    "Out of Town", "Guest Group", "Table Assignment", "Seat #", "Notes"
  ];

  const csvLines = [
    headers.join(","),
    ...rows.map(row => {
      if (row === null) {
        // Return a completely blank line matching columns count
        return headers.map(() => "").join(",");
      }
      return headers.map(header => {
        const val = row[header as keyof AislePlannerRow] || "";
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(",");
    })
  ];

  return csvLines.join("\n");
}
