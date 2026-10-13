"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { mockDatabase, Guest } from "@/lib/mockDatabase";
import BackgroundPhoto from "./BackgroundPhoto";
import imagesConfigDefault from "@config/ui/images.json";
import mealsConfigDefault from "@config/ui/meals.json";
import generalConfigDefault from "@config/ui/general.json";

export default function RSVPForm({ guest }: { guest: any }) {
  const plusOneIds = useRef<Record<string, string>>({});
  const originalNotes = useRef<Record<string, string>>({});
  const loadedCustomNotes = useRef("");
  const saving = useRef(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Household members (excluding +1s that aren't created yet)
  const [partyMembers, setPartyMembers] = useState<any[]>([]);
  
  // Party details (for address update)
  const [partyDetails, setPartyDetails] = useState<any>(null);

  const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);
  const [mealsConfig, setMealsConfig] = useState<any>(mealsConfigDefault);
  const [generalConfig, setGeneralConfig] = useState(generalConfigDefault);

  useEffect(() => {
    mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
    mockDatabase.getSiteConfig("meals", mealsConfigDefault).then(setMealsConfig);
    mockDatabase.getSiteConfig("general", generalConfigDefault).then(setGeneralConfig);
  }, []);

  // Map of guestId -> eligible events list
  const [guestEligibleEvents, setGuestEligibleEvents] = useState<Record<string, any[]>>({});

  // Individual RSVP details state
  // Key is either guestId or a virtual ID like `plus-one-${hostId}`
  const [rsvps, setRsvps] = useState<Record<string, {
    id: string;
    first_name: string;
    last_name: string;
    is_attending: boolean | null;
    meal_choice: string;
    dietary_restrictions: string;
    events: Record<string, boolean>; // eventId -> isAttending
    is_plus_one: boolean;
    parent_guest_id: string | null;
    plus_ones_allowed: number;
    age: string;
    needs_highchair: boolean;
    in_wheelchair: boolean;
  }>>({});

  // Mailing address and contact email
  const [contactEmail, setContactEmail] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  // Plus one toggles: hostId -> boolean
  const [hasPlusOne, setHasPlusOne] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        if (!guest || guest.id === "mock-guest-id") {
          throw new Error("Using mock guest");
        }

        // Fetch fresh guest info first to handle updated party_id
        let currentGuest = guest;
        const { data: freshGuest, error: guestError } = await supabase
          .from("guests")
          .select("*")
          .eq("id", guest.id)
          .single();
        if (guestError || !freshGuest) throw new Error("Invitation unavailable");
        currentGuest = freshGuest;

        // Fetch from Supabase
        let members: any[] = [];
        if (currentGuest.party_id) {
          const { data, error } = await supabase
            .from("guests")
            .select("*")
            .eq("party_id", currentGuest.party_id);
          if (error) throw error;
          if (data) members = data;
        } else {
          members = [currentGuest];
        }

        let party: any = null;
        if (currentGuest.party_id) {
          const { data, error } = await supabase
            .from("parties")
            .select("*")
            .eq("id", currentGuest.party_id)
            .single();
          if (error) throw error;
          party = data;
        }

        if (!members.length) throw new Error("Household unavailable");
        originalNotes.current = Object.fromEntries(members.map(member => [member.id, member.notes || ""]));
        loadedCustomNotes.current = (currentGuest.notes || "").split(" | ").filter((note: string) => note.startsWith("Note: ")).map((note: string) => note.slice(6)).join(" | ");
        setCustomNotes(loadedCustomNotes.current);
        setPartyDetails(party);
        setMailingAddress(currentGuest.address || "");
        setContactEmail(currentGuest.email || "");

        const household = members.filter(m => !m.is_plus_one);
        const sortedHousehold = [
          ...household.filter(m => m.id === currentGuest.id),
          ...household.filter(m => m.id !== currentGuest.id)
        ];
        setPartyMembers(sortedHousehold);

        const initialRsvps: Record<string, any> = {};
        const initialHasPlusOne: Record<string, boolean> = {};
        const eligibleEventsMap: Record<string, any[]> = {};

        const { data: householdEvents, error: eventsError } = await supabase
          .from("guest_events")
          .select("guest_id, event_id, is_attending, meal_choice, dietary_restrictions, events (*)")
          .in("guest_id", members.map(member => member.id));
        if (eventsError) throw eventsError;

        for (const m of household) {
          const eventData = (householdEvents || []).filter(event => event.guest_id === m.id);

          let eligibleEvents: any[] = [];
          const eventAttendance: Record<string, boolean> = {};
          let mMeal = "";
          let mDiet = "";

          if (eventData) {
            // Sort by events date and start_time to show in order
            const sortedEventData = [...eventData].sort((a: any, b: any) => {
              const aEv = a.events;
              const bEv = b.events;
              if (!aEv || !bEv) return 0;
              const aDateTime = `${aEv.date}T${aEv.start_time}`;
              const bDateTime = `${bEv.date}T${bEv.start_time}`;
              return aDateTime.localeCompare(bDateTime);
            });

            eligibleEvents = sortedEventData.map((d: any) => d.events).filter(Boolean);
            sortedEventData.forEach((d: any) => {
              if (d.is_attending !== null) {
                eventAttendance[d.event_id] = d.is_attending;
              }
            });
            mMeal = sortedEventData.find(event => event.meal_choice)?.meal_choice || "";
            mDiet = sortedEventData.find(event => event.dietary_restrictions)?.dietary_restrictions || "";
          }

          eligibleEventsMap[m.id] = eligibleEvents;

          initialRsvps[m.id] = {
            id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            is_attending: m.rsvp_status === "attending" ? true : m.rsvp_status === "declined" ? false : null,
            meal_choice: mMeal,
            dietary_restrictions: mDiet,
            events: eventAttendance,
            is_plus_one: false,
            parent_guest_id: null,
            plus_ones_allowed: m.plus_ones_allowed || 0,
            age: m.age || "Adult",
            needs_highchair: !!m.needs_highchair,
            in_wheelchair: !!m.in_wheelchair
          };

          if ((m.plus_ones_allowed || 0) > 0) {
            const plusOneGuest = members.find(p => p.is_plus_one && p.parent_guest_id === m.id);
            if (plusOneGuest) {
              initialHasPlusOne[m.id] = plusOneGuest.rsvp_status !== "declined";
              
              const pEventData = (householdEvents || []).filter(event => event.guest_id === plusOneGuest.id);

              const pEventAttendance: Record<string, boolean> = {};
              let pMeal = "";
              let pDiet = "";

              if (pEventData) {
                pEventData.forEach((d: any) => {
                  if (d.is_attending !== null) {
                    pEventAttendance[d.event_id] = d.is_attending;
                  }
                });
                pMeal = pEventData.find(event => event.meal_choice)?.meal_choice || "";
                pDiet = pEventData.find(event => event.dietary_restrictions)?.dietary_restrictions || "";
              }

              initialRsvps[plusOneGuest.id] = {
                id: plusOneGuest.id,
                first_name: plusOneGuest.first_name,
                last_name: plusOneGuest.last_name,
                is_attending: plusOneGuest.rsvp_status === "attending" ? true : plusOneGuest.rsvp_status === "declined" ? false : null,
                meal_choice: pMeal,
                dietary_restrictions: pDiet,
                events: pEventAttendance,
                is_plus_one: true,
                parent_guest_id: m.id,
                plus_ones_allowed: 0,
                age: plusOneGuest.age || "Adult",
                needs_highchair: !!plusOneGuest.needs_highchair,
                in_wheelchair: !!plusOneGuest.in_wheelchair
              };
              eligibleEventsMap[plusOneGuest.id] = eligibleEvents;
            } else {
              initialHasPlusOne[m.id] = false;
              const vKey = `plus-one-${m.id}`;
              initialRsvps[vKey] = {
                id: vKey,
                first_name: "",
                last_name: "",
                is_attending: null,
                meal_choice: "",
                dietary_restrictions: "",
                events: {},
                is_plus_one: true,
                parent_guest_id: m.id,
                plus_ones_allowed: 0,
                age: "Adult",
                needs_highchair: false,
                in_wheelchair: false
              };
              eligibleEventsMap[vKey] = eligibleEvents;
            }
          }
        }

        setRsvps(initialRsvps);
        setHasPlusOne(initialHasPlusOne);
        setGuestEligibleEvents(eligibleEventsMap);

      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    if (guest) fetchData();
  }, [guest, retry]);

  const updateRsvps = (id: string, fields: Partial<typeof rsvps[string]>) => {
    setValidationError("");
    setRsvps(prev => ({
      ...prev,
      [id]: { ...prev[id], ...fields }
    }));
  };

  const updateEventRsvp = (guestId: string, eventId: string, checked: boolean) => {
    setValidationError("");
    setRsvps(prev => ({
      ...prev,
      [guestId]: {
        ...prev[guestId],
        events: {
          ...prev[guestId].events,
          [eventId]: checked
        }
      }
    }));
  };

  const getPlusOneKey = (hostId: string) => {
    const existing = Object.values(rsvps).find(r => r.is_plus_one && r.parent_guest_id === hostId);
    return existing ? existing.id : `plus-one-${hostId}`;
  };

  const togglePlusOne = (hostId: string, checked: boolean) => {
    setValidationError("");
    setHasPlusOne(prev => ({ ...prev, [hostId]: checked }));
    const plusOneKey = getPlusOneKey(hostId);
    
    setRsvps(prev => {
      const updated = { ...prev };
      if (updated[plusOneKey]) {
        updated[plusOneKey] = { ...updated[plusOneKey], is_attending: checked };
      }
      return updated;
    });
  };

  const getAttendingGuests = () => {
    return Object.values(rsvps).filter(r => {
      if (r.is_plus_one) {
        return r.is_attending === true && rsvps[r.parent_guest_id || ""]?.is_attending === true && !!hasPlusOne[r.parent_guest_id || ""];
      }
      return r.is_attending === true;
    });
  };

  const handleNext = () => {
    setValidationError("");
    if (step === 1) {
      // Validate that all guests have made an active selection
      const unselected = Object.values(rsvps).filter(r => {
        // Skip virtual plus-ones if they aren't bringing one
        if (r.is_plus_one) {
          return hasPlusOne[r.parent_guest_id || ""] && r.is_attending === null;
        }
        return r.is_attending === null;
      });

      if (unselected.length > 0) {
        setValidationError("Please select whether each guest in your party is Attending or Declined.");
        return;
      }

      if (getAttendingGuests().length === 0) {
        setStep(3); // Skip preferences step if everyone declined
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      // Validate age and meal choices for all attending guests
      const attendingGuests = getAttendingGuests();
      const missingAge = attendingGuests.filter(g => !g.age);
      if (missingAge.length > 0) {
        setValidationError("Please select an age category for all attending guests.");
        return;
      }
      const missingMeal = attendingGuests.filter(g => !g.meal_choice);
      if (missingMeal.length > 0) {
        setValidationError("Please make a meal selection for all attending guests.");
        return;
      }
      setStep(3);
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    setValidationError("");
    if (step === 3) {
      if (getAttendingGuests().length === 0) {
        setStep(1);
      } else {
        setStep(2);
      }
    } else {
      setStep(s => s - 1);
    }
  };

  const handleSubmit = async () => {
    if (saving.current || submitting || loading || loadError) return;
    saving.current = true;
    setSubmitting(true);
    setValidationError("");

    // --- Strict Client-Side Validation ---
    // Rule: Names cannot contain pure numbers or common symbols like "+"
    const nameBlockRegex = /[0-9+]/;
    for (const r of Object.values(rsvps)) {
      const isBringing = r.is_plus_one ? !!hasPlusOne[r.parent_guest_id || ""] && rsvps[r.parent_guest_id || ""]?.is_attending === true : true;
      const isAttending = r.is_attending && isBringing;

      if (isAttending) {
        const fName = r.first_name.trim();
        const lName = r.last_name.trim();

        if (!fName || !lName) {
          setValidationError("First name and last name are required for all attending guests.");
          saving.current = false;
          setSubmitting(false);
          return;
        }

        if (nameBlockRegex.test(fName) || nameBlockRegex.test(lName)) {
          setValidationError(
            `Names cannot contain numbers or special characters like '+'. Please correct the name for "${r.first_name} ${r.last_name}".`
          );
          saving.current = false;
          setSubmitting(false);
          return;
        }
      }
    }
    
    try {
      if (!guest || guest.id === "mock-guest-id") {
        throw new Error("Using mock guest");
      }
      
      // Save RSVPs
      for (const r of Object.values(rsvps)) {
        // Consolidate dietary restrictions, logistics, and custom comments into 'notes'
        const notesParts = (originalNotes.current[r.id] || "").split(" | ").filter(note => note && !note.startsWith("Dietary: ") && note !== "Wheelchair Access Needed" && note !== "Needs Highchair" && !(customNotes !== loadedCustomNotes.current && note.startsWith("Note: ")));
        if (r.dietary_restrictions && r.dietary_restrictions.trim()) {
          notesParts.push(`Dietary: ${r.dietary_restrictions.trim()}`);
        }
        if (r.in_wheelchair) {
          notesParts.push("Wheelchair Access Needed");
        }
        if (r.needs_highchair && (r.age === "Child" || r.age === "Infant")) {
          notesParts.push("Needs Highchair");
        }
        if (customNotes !== loadedCustomNotes.current && customNotes.trim()) {
          notesParts.push(`Note: ${customNotes.trim()}`);
        }
        const consolidatedNotes = notesParts.join(" | ");

        if (r.is_plus_one) {
          const isBringing = !!hasPlusOne[r.parent_guest_id || ""] && rsvps[r.parent_guest_id || ""]?.is_attending === true;
          const isAttending = r.is_attending && isBringing;

          if (isAttending) {
            let plusOneId = r.id;

            if (plusOneId.startsWith("plus-one-")) {
              const newUuid = plusOneIds.current[r.id] ||= crypto.randomUUID();
              const { error: insError } = await supabase
                .from("guests")
                .upsert({
                  id: newUuid,
                  first_name: r.first_name.trim(),
                  last_name: r.last_name.trim(),
                  party_id: partyDetails?.id || guest.party_id || null,
                  rsvp_status: "attending",
                  is_plus_one: true,
                  parent_guest_id: r.parent_guest_id,
                  age: r.age,
                  needs_highchair: r.needs_highchair,
                  in_wheelchair: r.in_wheelchair,
                  notes: consolidatedNotes
                });
              if (insError) throw insError;
              plusOneId = newUuid;
            } else {
              const { error: updError } = await supabase
                .from("guests")
                .update({
                  first_name: r.first_name.trim(),
                  last_name: r.last_name.trim(),
                  rsvp_status: "attending",
                  age: r.age,
                  needs_highchair: r.needs_highchair,
                  in_wheelchair: r.in_wheelchair,
                  notes: consolidatedNotes
                })
                .eq("id", plusOneId).select("id").single();
              if (updError) throw updError;
            }

            const eligibleEvents = guestEligibleEvents[r.id] || [];
            for (const ev of eligibleEvents) {
              const checked = isAttending;
              const { error: evError } = await supabase
                .from("guest_events")
                .upsert({
                  guest_id: plusOneId,
                  event_id: ev.id,
                  is_attending: checked,
                  meal_choice: checked ? r.meal_choice : null,
                  dietary_restrictions: checked ? r.dietary_restrictions : null
                }, { onConflict: "guest_id,event_id" });
              if (evError) throw evError;
            }
          } else {
            // Keep the invitation and history when a plus one is no longer attending.
            const savedId = r.id.startsWith("plus-one-") ? plusOneIds.current[r.id] : r.id;
            if (savedId) {
              const { error: delError } = await supabase
                .from("guests")
                .update({ rsvp_status: "declined" })
                .eq("id", savedId).select("id").single();
              if (delError) throw delError;
              const { error: eventError } = await supabase.from("guest_events")
                .update({ is_attending: false }).eq("guest_id", savedId);
              if (eventError) throw eventError;
            }
          }
        } else {
          // Household guest update
          const { error: updError } = await supabase
            .from("guests")
            .update({
              first_name: r.first_name.trim(),
              last_name: r.last_name.trim(),
              rsvp_status: r.is_attending ? "attending" : "declined",
              age: r.age,
              needs_highchair: r.needs_highchair,
              in_wheelchair: r.in_wheelchair,
              notes: consolidatedNotes
            })
            .eq("id", r.id).select("id").single();
          if (updError) throw updError;

          const eligibleEvents = guestEligibleEvents[r.id] || [];
          for (const ev of eligibleEvents) {
            const checked = r.is_attending;
            const { error: evError } = await supabase
              .from("guest_events")
              .upsert({
                guest_id: r.id,
                event_id: ev.id,
                is_attending: checked,
                meal_choice: checked ? r.meal_choice : null,
                dietary_restrictions: checked ? r.dietary_restrictions : null
              }, { onConflict: "guest_id,event_id" });
            if (evError) throw evError;
          }
        }
      }

      setSubmitting(false);
      setSuccess(true);

    } catch (err) {
      console.error("Failed to submit RSVP to Supabase:", err);
      setValidationError("Your RSVP could not be fully saved. Some details may already be saved; please retry to finish or contact the hosts.");
      setSubmitting(false);
    } finally {
      saving.current = false;
    }
  };

  const currentStepLabel = ["Attendance", "Preferences", "Notes & Confirmation"][step - 1];

  const formatOpenDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      }
      return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch (e) {
      return dateStr;
    }
  };

  const rsvpOpenDateStr = generalConfig.rsvp_open_date;
  const isRsvpOpen = (() => {
    if (!rsvpOpenDateStr) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = rsvpOpenDateStr.split("-");
    if (parts.length === 3) {
      const openDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return today >= openDate;
    }
    return today >= new Date(rsvpOpenDateStr);
  })();

  if (loading || loadError) return (
    <section id="rsvp" className="py-16 md:py-24 px-6 bg-cream text-center space-y-4">
      <h2 className="text-4xl font-serif text-charcoal">Response</h2>
      <p role={loadError ? "alert" : "status"} className="font-sans text-copy text-muted">
        {loadError ? "We couldn't load your current RSVP details. Please try again." : "Loading your invitation…"}
      </p>
      {loadError && <button onClick={() => setRetry(value => value + 1)} className="px-5 py-3 border border-line text-action rounded-sm">Retry RSVP</button>}
    </section>
  );

  return (
    <section 
      id="rsvp" 
      className="relative py-16 md:py-24 px-6 overflow-hidden"
      style={{ clipPath: "inset(0px)" }}
    >
      <BackgroundPhoto config={imagesConfig} slot="rsvp" fallback="/photos/engagement/K%26A%20Engagement%20highlights-11.jpg" />
      <div className="absolute inset-0 bg-charcoal/60 pointer-events-none"></div>
      <div className="relative max-w-2xl mx-auto z-10">
        <div className="text-center mb-10 md:mb-12">
          <span className="font-sans text-label uppercase tracking-label text-cream/90 block mb-3 font-medium">RSVP</span>
          <h2 className="text-4xl md:text-5xl font-serif text-cream mb-4 text-balance">Response</h2>
          <p className="text-cream/90 font-serif italic text-lg max-w-md mx-auto leading-relaxed">
            {generalConfig.rsvp_deadline_message || "Please let us know your plans by October 1st."}
          </p>
          {!success && isRsvpOpen && (
            <p className="font-sans text-label tracking-label text-cream/90 uppercase font-medium mt-6">
              Step {step} of 3: {currentStepLabel}
            </p>
          )}
        </div>

        <div className={`bg-surface/90 border border-line backdrop-blur-lg p-6 sm:p-8 md:p-12 rounded-sm shadow-card relative overflow-hidden ${isRsvpOpen ? "min-h-[400px]" : ""}`}>
          {!isRsvpOpen ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center py-4 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-olive/10 text-olive flex items-center justify-center mb-6">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h3 className="text-2xl font-serif text-charcoal mb-4 text-balance">RSVP is not open yet</h3>
              <p className="font-sans text-copy text-charcoal/80 tracking-normal max-w-sm leading-relaxed">
                Invites have not been sent yet or online RSVP is not open at this time.
                <br />
                Please check back on <span className="font-semibold text-terracotta">{formatOpenDate(rsvpOpenDateStr)}</span> when RSVP opens.
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
            {/* Step 1: Attendance */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8 flex flex-col h-full"
              >
                <div className="flex-1 space-y-6">
                  <div className="text-center mb-6">
                    <p className="font-serif text-2xl text-charcoal leading-relaxed">
                      Hello, {guest.first_name}
                    </p>
                    <p className="font-sans text-copy tracking-label text-charcoal/80 max-w-md mx-auto mt-2">
                      Please verify names and confirm attendance for each member of your party.
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    {partyMembers.map(member => {
                      const rsvp = rsvps[member.id];
                      if (!rsvp) return null;
                      return (
                        <div key={member.id} className="p-5 border border-olive/15 rounded-sm space-y-4 bg-cream/30">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex gap-2 flex-1">
                              <input
                                type="text"
                                placeholder="First Name"
                                value={rsvp.first_name}
                                onChange={(e) => updateRsvps(member.id, { first_name: e.target.value })}
                                className="w-full border-b border-olive/30 bg-transparent py-1.5 outline-none font-sans text-base focus:border-terracotta transition-colors text-charcoal"
                              />
                              <input
                                type="text"
                                placeholder="Last Name"
                                value={rsvp.last_name}
                                onChange={(e) => updateRsvps(member.id, { last_name: e.target.value })}
                                className="w-full border-b border-olive/30 bg-transparent py-1.5 outline-none font-sans text-base focus:border-terracotta transition-colors text-charcoal"
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => updateRsvps(member.id, { is_attending: true })}
                                className={`px-4 py-2.5 sm:py-2 min-h-[44px] text-label font-sans uppercase tracking-label rounded-sm font-semibold transition-all duration-300 ${
                                  rsvp.is_attending === true
                                    ? "bg-action text-cream shadow-card"
                                    : "border border-olive/35 text-olive hover:bg-olive/5"
                                }`}
                              >
                                Attending
                              </button>
                              <button
                                type="button"
                                onClick={() => updateRsvps(member.id, { is_attending: false })}
                                className={`px-4 py-2.5 sm:py-2 min-h-[44px] text-label font-sans uppercase tracking-label rounded-sm font-semibold transition-all duration-300 ${
                                  rsvp.is_attending === false
                                    ? "bg-olive text-cream shadow-card"
                                    : "border border-olive/35 text-olive hover:bg-olive/5"
                                }`}
                              >
                                Declining
                              </button>
                            </div>
                          </div>

                          {/* Plus One details inside host guest panel */}
                          {member.plus_ones_allowed > 0 && (
                            <div className="mt-4 pt-4 border-t border-olive/10">
                              <label className="flex items-center space-x-2.5 cursor-pointer pb-2">
                                <input
                                  type="checkbox"
                                  checked={!!hasPlusOne[member.id]}
                                  onChange={(e) => togglePlusOne(member.id, e.target.checked)}
                                  className="rounded border-olive/35 text-terracotta focus:ring-terracotta h-4 w-4"
                                />
                                <span className="font-sans font-semibold text-charcoal/80 uppercase text-label tracking-label">Bring a plus one guest?</span>
                              </label>

                              {hasPlusOne[member.id] && (() => {
                                const plusOneKey = getPlusOneKey(member.id);
                                const pRsvp = rsvps[plusOneKey];
                                if (!pRsvp) return null;
                                return (
                                  <div className="mt-3 p-4 bg-cream/65 border border-olive/15 rounded-sm space-y-3">
                                    <span className="font-sans text-label uppercase tracking-label text-muted font-bold block">Plus One Details</span>
                                    <div className="flex gap-2 w-full">
                                      <input
                                        type="text"
                                        placeholder="First Name"
                                        value={pRsvp.first_name}
                                        onChange={(e) => updateRsvps(plusOneKey, { first_name: e.target.value })}
                                        className="w-1/2 border-b border-olive/30 bg-transparent py-1.5 outline-none font-sans text-base focus:border-terracotta transition-colors text-charcoal"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={pRsvp.last_name}
                                        onChange={(e) => updateRsvps(plusOneKey, { last_name: e.target.value })}
                                        className="w-1/2 border-b border-olive/30 bg-transparent py-1.5 outline-none font-sans text-base focus:border-terracotta transition-colors text-charcoal"
                                      />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {validationError && (
                  <div role="alert" className="p-3 bg-danger-soft border border-danger-line text-danger text-caption font-sans rounded-sm text-center mb-4">
                    {validationError}
                  </div>
                )}

                <div className="pt-6 border-t border-olive/15 mt-4">
                  <button 
                    onClick={handleNext} 
                    className="w-full py-4 bg-action text-cream font-sans text-label uppercase tracking-label hover:bg-action-hover transition-colors duration-500 shadow-card font-semibold rounded-sm"
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Individual Preferences */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 flex flex-col h-full"
              >
                <div className="flex-1 space-y-6 max-h-[50vh] sm:max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-olive/20">
                  {getAttendingGuests().map(g => (
                    <div key={g.id} className="p-6 border border-olive/15 bg-cream/35 rounded-sm space-y-5">
                      <h3 className="font-serif text-lg text-charcoal border-b border-olive/10 pb-2 text-balance">
                        {g.first_name || "(Guest)"} {g.last_name || ""}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="relative">
                          <label className="block font-sans text-label uppercase tracking-label text-muted mb-1.5 font-bold">Age Category *</label>
                          <select
                            value={g.age}
                            onChange={(e) => updateRsvps(g.id, { age: e.target.value })}
                            className="w-full border-b border-olive/30 bg-transparent py-2 outline-none font-sans text-base focus:border-terracotta transition-colors text-charcoal appearance-none cursor-pointer"
                          >
                            <option value="Adult" className="bg-cream">Adult</option>
                            <option value="Child" className="bg-cream">Child</option>
                            <option value="Infant" className="bg-cream">Infant</option>
                          </select>
                        </div>
                        <div className="relative">
                          <label className="block font-sans text-label uppercase tracking-label text-muted mb-1.5 font-bold">Meal Selection *</label>
                          <select
                            value={g.meal_choice}
                            onChange={(e) => updateRsvps(g.id, { meal_choice: e.target.value })}
                            className="w-full border-b border-olive/30 bg-transparent py-2 outline-none font-sans text-base focus:border-terracotta transition-colors text-charcoal appearance-none cursor-pointer"
                          >
                            <option value="" disabled className="bg-cream text-muted">Select a meal option</option>
                            {(mealsConfig.list || []).map((meal: any) => (
                              <option key={meal.key} value={meal.key} className="bg-cream text-charcoal">
                                {meal.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-sans text-label uppercase tracking-label text-muted mb-1.5 font-bold">Dietary Restrictions</label>
                          <input
                            type="text"
                            value={g.dietary_restrictions || ""}
                            onChange={(e) => updateRsvps(g.id, { dietary_restrictions: e.target.value })}
                            className="w-full border-b border-olive/30 bg-transparent py-2 outline-none font-sans text-base focus:border-terracotta transition-colors text-charcoal placeholder:text-charcoal/30"
                            placeholder="Allergies, requirements..."
                          />
                        </div>
                      </div>

                      {/* Accessibility & Logistics Checklist */}
                      <div className="space-y-2">
                        <label className="block font-sans text-label uppercase tracking-label text-muted font-bold">Logistics & Accessibility</label>
                        <div className="flex flex-wrap gap-6 pt-1">
                          <label className="flex items-center space-x-2.5 cursor-pointer group">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={!!g.in_wheelchair}
                              onChange={(e) => updateRsvps(g.id, { in_wheelchair: e.target.checked })}
                            />
                            <div className="w-4 h-4 border border-olive/35 rounded-sm bg-transparent peer-checked:bg-terracotta peer-checked:border-terracotta flex items-center justify-center transition-colors">
                              {!!g.in_wheelchair && (
                                <svg className="w-2.5 h-2.5 text-cream" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </div>
                            <span className="font-sans text-label uppercase tracking-label text-charcoal/80 group-hover:text-terracotta transition-colors">
                              Requires Wheelchair Access
                            </span>
                          </label>

                          {(g.age === "Child" || g.age === "Infant") && (
                            <label className="flex items-center space-x-2.5 cursor-pointer group">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={!!g.needs_highchair}
                                onChange={(e) => updateRsvps(g.id, { needs_highchair: e.target.checked })}
                              />
                              <div className="w-4 h-4 border border-olive/35 rounded-sm bg-transparent peer-checked:bg-terracotta peer-checked:border-terracotta flex items-center justify-center transition-colors">
                                {!!g.needs_highchair && (
                                  <svg className="w-2.5 h-2.5 text-cream" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </div>
                              <span className="font-sans text-label uppercase tracking-label text-charcoal/80 group-hover:text-terracotta transition-colors">
                                Needs Highchair
                              </span>
                            </label>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {validationError && (
                  <div role="alert" className="p-3 bg-danger-soft border border-danger-line text-danger text-caption font-sans rounded-sm text-center mb-4">
                    {validationError}
                  </div>
                )}

                <div className="flex space-x-4 pt-6 border-t border-olive/15 mt-4">
                  <button 
                    onClick={handleBack} 
                    className="flex-1 py-4 border border-olive/30 text-olive font-sans text-label uppercase tracking-label hover:bg-olive/5 transition-colors duration-300 rounded-sm"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="flex-1 py-4 bg-action text-cream font-sans text-label uppercase tracking-label hover:bg-action-hover transition-colors duration-500 font-semibold rounded-sm shadow-card"
                  >
                    Next
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Mailing & Contact */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 flex flex-col h-full"
              >
                <div className="flex-1 space-y-6">
                  <div>
                    <label htmlFor="rsvp-notes" className="block font-sans text-label uppercase tracking-label text-muted mb-2 font-semibold">Notes for the Couple (Optional)</label>
                    <textarea
                      id="rsvp-notes"
                      maxLength={2000}
                      value={customNotes}
                      onChange={(e) => {
                        setValidationError("");
                        setCustomNotes(e.target.value);
                      }}
                      className="w-full border border-olive/15 bg-cream/30 p-4 outline-none font-sans text-base focus:border-terracotta transition-colors text-charcoal h-28 resize-none placeholder:text-charcoal/30 rounded-sm"
                      placeholder="Custom messages, requests, or questions..."
                    />
                  </div>
                </div>

                {validationError && (
                  <div role="alert" className="p-3 bg-danger-soft border border-danger-line text-danger text-caption font-sans rounded-sm text-center mb-4">
                    {validationError}
                  </div>
                )}

                <div className="flex space-x-4 pt-6 border-t border-olive/15 mt-4">
                  <button 
                    disabled={submitting} 
                    onClick={handleBack} 
                    className="flex-1 py-4 border border-olive/30 text-olive font-sans text-label uppercase tracking-label hover:bg-olive/5 transition-colors duration-300 rounded-sm disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="flex-[2] relative py-4 bg-action text-cream font-sans text-label uppercase tracking-label hover:bg-action-hover transition-colors duration-500 font-semibold rounded-sm shadow-card disabled:opacity-100 overflow-hidden"
                  >
                    {submitting ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-action">
                        <div className="relative w-12 h-5 border border-cream/60 rounded-sm flex items-center p-[2px]">
                          <div className="absolute -right-1 w-[2px] h-2 bg-cream/60 rounded-r-sm"></div>
                          <motion.div
                            className="h-full bg-cream rounded-sm"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.8, ease: "linear" }}
                          />
                        </div>
                      </div>
                    ) : (
                      "Submit RSVP"
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Success State */}
            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-cream/40 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center mb-6">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 className="text-3xl font-serif text-charcoal mb-4 text-balance">RSVP Submitted</h3>
                <p className="font-sans text-copy text-charcoal/80 tracking-normal max-w-sm leading-relaxed mb-8">
                  Thank you, {guest.first_name}. Your responses have been logged. We look forward to celebrating together in the desert.
                </p>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setStep(1);
                  }}
                  className="px-8 py-3.5 border border-olive text-olive font-sans text-label uppercase tracking-label hover:border-terracotta hover:text-terracotta transition-colors duration-300 rounded-sm"
                >
                  Modify Response
                </button>
              </motion.div>
            )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
