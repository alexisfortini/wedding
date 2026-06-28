"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  User, 
  Calendar, 
  Lock, 
  LogOut, 
  Users, 
  Check, 
  AlertCircle,
  FileText,
  RotateCcw,
  Upload,
  History,
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Database,
  Sliders,
  Save,
  Plane,
  Bed,
  MapPin,
  Search,
  Loader2,
  Monitor,
  Smartphone
} from "lucide-react";
import { mockDatabase, Guest, Party, Group, Event, GuestGroup } from "@/lib/mockDatabase";
import adminConfigDefault from "@config/ui/admin.json";
import generalConfigDefault from "@config/ui/general.json";
import storyConfigDefault from "@config/ui/story.json";
import faqConfigDefault from "@config/ui/faq.json";
import travelConfigDefault from "@config/ui/travel.json";
import registryConfigDefault from "@config/ui/registry.json";
import mapConfigDefault from "@config/ui/map.json";
import djConfigDefault from "@config/ui/dj_lineup.json";
import weekendConfigDefault from "@config/ui/weekend.json";
import imagesConfigDefault from "@config/ui/images.json";
import mealsConfigDefault from "@config/ui/meals.json";
import { exportToAislePlanner, convertToAislePlannerCSV } from "@/lib/aislePlannerExporter";

const DEFAULT_CONFIGS: Record<string, any> = {
  general: generalConfigDefault,
  story: storyConfigDefault,
  faq: faqConfigDefault,
  travel: travelConfigDefault,
  registry: registryConfigDefault,
  map: mapConfigDefault,
  dj_lineup: djConfigDefault,
  weekend: weekendConfigDefault,
  admin: adminConfigDefault,
  images: imagesConfigDefault,
  meals: mealsConfigDefault
};

export default function AdminPage() {
  const [adminConfig, setAdminConfig] = useState(adminConfigDefault);
  const [guestSession, setGuestSession] = useState<Guest | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");

  useEffect(() => {
    mockDatabase.getSiteConfig("admin", adminConfigDefault).then(setAdminConfig);
  }, []);
  
  // Tab states: 'guests' | 'events' | 'parties' | 'export' | 'backups' | 'settings'
  const [activeTab, setActiveTab] = useState<"guests" | "events" | "parties" | "export" | "backups" | "settings">("guests");
  const [backups, setBackups] = useState<any[]>([]);
  const [exportLayout, setExportLayout] = useState<"individual" | "grouped">("individual");
  const [isSyncing, setIsSyncing] = useState(false);

  // Settings CMS Tab States
  const [activeSettingsSection, setActiveSettingsSection] = useState<"general" | "story" | "faq" | "travel" | "registry" | "map" | "dj_lineup" | "weekend" | "admin" | "images" | "meals">("general");
  const [tempConfigData, setTempConfigData] = useState<any>(null);
  const [geocodingIdx, setGeocodingIdx] = useState<number | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [activeViewport, setActiveViewport] = useState<Record<string, "desktop" | "mobile">>({});
  
  // Data states from mockDatabase
  const [guests, setGuests] = useState<Guest[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [guestGroups, setGuestGroups] = useState<GuestGroup[]>([]);
  const [guestEvents, setGuestEvents] = useState<any[]>([]);

  const [sortField, setSortField] = useState<"last_name" | "first_name" | "rsvp_status" | "party_name" | "plus_ones" | "group">("last_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Editing / Form states
  const [isEditingGuest, setIsEditingGuest] = useState<Guest | null>(null);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [newGuestData, setNewGuestData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    party_id: "",
    rsvp_status: "pending",
    notes: "",
    selectedGroups: [] as string[],
    is_plus_one: false,
    parent_guest_id: "",
    plus_ones_allowed: 0,
    age: "Adult",
    needs_highchair: false,
    in_wheelchair: false,
    address: ""
  });

  const [isEditingEvent, setIsEditingEvent] = useState<Event | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventData, setNewEventData] = useState({
    title: "",
    description: "",
    date: "",
    start_time: "",
    end_time: "",
    location: "",
    dress_code: "",
    is_public: true,
    group_id: ""
  });

  const [isEditingParty, setIsEditingParty] = useState<Party | null>(null);
  const [newPartyName, setNewPartyName] = useState("");
  const [showAddParty, setShowAddParty] = useState(false);
  const [tempPartyMembers, setTempPartyMembers] = useState<Guest[]>([]);
  const [selectedGuestToAdd, setSelectedGuestToAdd] = useState<string>("");


  // Load everything from database
  const refreshData = async () => {
    try {
      const [g, p, gr, e, gg, ge, b] = await Promise.all([
        mockDatabase.getGuests(),
        mockDatabase.getParties(),
        mockDatabase.getGroups(),
        mockDatabase.getEvents(),
        mockDatabase.getGuestGroups(),
        mockDatabase.getGuestEvents(),
        mockDatabase.getBackups()
      ]);
      setGuests(g);
      setParties(p);
      setGroups(gr);
      setEvents(e);
      setGuestGroups(gg);
      setGuestEvents(ge);
      setBackups(b);
    } catch (err) {
      console.error("Failed to load admin data:", err);
    }
  };

  // CMS Settings loaders, savers & nested array state helpers
  const loadSettingsConfig = async (section: string) => {
    setIsConfigLoaded(false);
    try {
      const fallback = DEFAULT_CONFIGS[section];
      const data = await mockDatabase.getSiteConfig(section, fallback);
      setTempConfigData(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      console.error(`Failed to load config for ${section}:`, err);
    } finally {
      setIsConfigLoaded(true);
    }
  };

  useEffect(() => {
    if (activeTab === "settings") {
      loadSettingsConfig(activeSettingsSection);
    }
  }, [activeTab, activeSettingsSection]);

  useEffect(() => {
    if (activeTab === "settings" && activeSettingsSection === "images") {
      fetch("/api/gallery-photos")
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setGalleryPhotos(data.photos);
          }
        })
        .catch(err => console.error("Failed to load gallery photos:", err));
    }
  }, [activeTab, activeSettingsSection]);

  const handleSaveSettingsConfig = async () => {
    if (!tempConfigData) return;
    setIsSavingConfig(true);
    try {
      await mockDatabase.saveSiteConfig(activeSettingsSection, tempConfigData);
      
      if (activeSettingsSection === "admin") {
        setAdminConfig(tempConfigData);
      }

      if (confirm("Configuration saved to Supabase!\n\nWould you like to sync these changes to your local project files right now?")) {
        setIsSyncing(true);
        try {
          const currentPasscode = sessionStorage.getItem("wedding_admin_passcode") || "";
          const res = await fetch("/api/sync-supabase-to-local", {
            method: "POST",
            headers: { "x-admin-passcode": currentPasscode }
          });
          const data = await res.json();
          if (data.success) {
            if (data.environment === "production") {
              alert(
                "Saved to Database!\n\n" +
                "NOTE: Since the website is running live in Cloud Run, local files on your computer's Git repository were not changed permanently.\n\n" +
                "To sync these changes to your laptop's local files, run this command in your laptop's terminal:\n" +
                "node scratch/download_data.js"
              );
            } else {
              alert("Successfully synced and updated local configuration files!");
            }
          } else {
            alert("Error syncing to local: " + (data.error || "Unknown error"));
          }
        } catch (err: any) {
          console.error("Local sync error:", err);
          alert("Failed to sync to local: " + err.message);
        } finally {
          setIsSyncing(false);
        }
      }
    } catch (err: any) {
      console.error("Failed to save config:", err);
      alert("Failed to save config: " + err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setTempConfigData((prev: any) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  // Timeline helpers
  const updateTimelineItem = (idx: number, key: string, val: any) => {
    setTempConfigData((prev: any) => {
      const timeline = [...prev.timeline];
      timeline[idx] = { ...timeline[idx], [key]: val };
      return { ...prev, timeline };
    });
  };
  const addTimelineItem = () => {
    setTempConfigData((prev: any) => ({
      ...prev,
      timeline: [...prev.timeline, { year: "", title: "", description: "" }]
    }));
  };
  const deleteTimelineItem = (idx: number) => {
    setTempConfigData((prev: any) => ({
      ...prev,
      timeline: prev.timeline.filter((_: any, i: number) => i !== idx)
    }));
  };

  // FAQ helpers
  const updateFAQItem = (idx: number, key: string, val: any) => {
    setTempConfigData((prev: any) => {
      const list = [...prev.list];
      list[idx] = { ...list[idx], [key]: val };
      return { ...prev, list };
    });
  };
  const addFAQItem = () => {
    setTempConfigData((prev: any) => ({
      ...prev,
      list: [...prev.list, { q: "", a: "" }]
    }));
  };
  const deleteFAQItem = (idx: number) => {
    setTempConfigData((prev: any) => ({
      ...prev,
      list: prev.list.filter((_: any, i: number) => i !== idx)
    }));
  };

  // Meals helpers
  const updateMealItem = (idx: number, key: string, val: any) => {
    setTempConfigData((prev: any) => {
      const list = [...(prev.list || [])];
      list[idx] = { ...list[idx], [key]: val };
      return { ...prev, list };
    });
  };
  const addMealItem = () => {
    setTempConfigData((prev: any) => ({
      ...prev,
      list: [...(prev.list || []), { key: `option-${Date.now()}`, label: "New Meal Option" }]
    }));
  };
  const deleteMealItem = (idx: number) => {
    setTempConfigData((prev: any) => ({
      ...prev,
      list: (prev.list || []).filter((_: any, i: number) => i !== idx)
    }));
  };

  // Travel helpers
  const updateAirportItem = (idx: number, key: string, val: any) => {
    setTempConfigData((prev: any) => {
      const airports = [...prev.airports];
      airports[idx] = { ...airports[idx], [key]: val };
      return { ...prev, airports };
    });
  };
  const addAirportItem = () => {
    setTempConfigData((prev: any) => ({
      ...prev,
      airports: [...prev.airports, { title: "", description: "", tag: "" }]
    }));
  };
  const deleteAirportItem = (idx: number) => {
    setTempConfigData((prev: any) => ({
      ...prev,
      airports: prev.airports.filter((_: any, i: number) => i !== idx)
    }));
  };

  const updateHotelItem = (idx: number, key: string, val: any) => {
    setTempConfigData((prev: any) => {
      const hotels = [...prev.hotels];
      hotels[idx] = { ...hotels[idx], [key]: val };
      return { ...prev, hotels };
    });
  };
  const addHotelItem = () => {
    setTempConfigData((prev: any) => ({
      ...prev,
      hotels: [...prev.hotels, { title: "", description: "", book_url: "" }]
    }));
  };
  const deleteHotelItem = (idx: number) => {
    setTempConfigData((prev: any) => ({
      ...prev,
      hotels: prev.hotels.filter((_: any, i: number) => i !== idx)
    }));
  };

  const updateFavoriteItem = (idx: number, key: string, val: any) => {
    setTempConfigData((prev: any) => {
      const favorites = [...prev.favorites];
      favorites[idx] = { ...favorites[idx], [key]: val };
      return { ...prev, favorites };
    });
  };
  const addFavoriteItem = () => {
    setTempConfigData((prev: any) => ({
      ...prev,
      favorites: [...prev.favorites, { title: "", description: "", icon: "MapPin" }]
    }));
  };
  const deleteFavoriteItem = (idx: number) => {
    setTempConfigData((prev: any) => ({
      ...prev,
      favorites: prev.favorites.filter((_: any, i: number) => i !== idx)
    }));
  };

  // Registry helpers
  const updateRegistryFundItem = (idx: number, key: string, val: any) => {
    setTempConfigData((prev: any) => {
      const funds = [...prev.funds];
      funds[idx] = { ...funds[idx], [key]: val };
      return { ...prev, funds };
    });
  };
  const addRegistryFundItem = () => {
    setTempConfigData((prev: any) => ({
      ...prev,
      funds: [...prev.funds, { title: "", description: "", button_text: "Send a Gift", icon: "Heart", url: "" }]
    }));
  };
  const deleteRegistryFundItem = (idx: number) => {
    setTempConfigData((prev: any) => ({
      ...prev,
      funds: prev.funds.filter((_: any, i: number) => i !== idx)
    }));
  };

  // Map helpers
  const updateMapLocationItem = (idx: number, key: string, val: any) => {
    setTempConfigData((prev: any) => {
      const locations = [...prev.locations];
      locations[idx] = { ...locations[idx], [key]: val };
      return { ...prev, locations };
    });
  };
  const addMapLocationItem = () => {
    setTempConfigData((prev: any) => ({
      ...prev,
      locations: [...prev.locations, { id: `loc-${Date.now()}`, name: "", lat: 33.70, lng: -116.40, type: "Activities", icon: "MapPin", color: "#8B5CF6" }]
    }));
  };
  const deleteMapLocationItem = (idx: number) => {
    setTempConfigData((prev: any) => ({
      ...prev,
      locations: prev.locations.filter((_: any, i: number) => i !== idx)
    }));
  };
  const updateMapLocationCoords = (idx: number, lat: number, lng: number) => {
    setTempConfigData((prev: any) => {
      const locations = [...prev.locations];
      locations[idx] = { ...locations[idx], lat, lng };
      return { ...prev, locations };
    });
  };
  const geocodeAddress = async (idx: number, address: string) => {
    if (!address.trim()) return;
    setGeocodingIdx(idx);
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`
      );
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        updateMapLocationCoords(idx, lat, lng);
      } else {
        alert("No results found for that address. Try a more specific query.");
      }
    } catch (err) {
      console.error("Geocode error:", err);
      alert("Geocoding failed. Please check your connection and try again.");
    } finally {
      setGeocodingIdx(null);
    }
  };

  // DJ Lineup helpers
  const updateDJEventName = (eventIdx: number, val: string) => {
    setTempConfigData((prev: any) => {
      const events = [...prev.events];
      events[eventIdx] = { ...events[eventIdx], name: val };
      return { ...prev, events };
    });
  };
  const updateDJLineupItem = (eventIdx: number, lineupIdx: number, key: string, val: any) => {
    setTempConfigData((prev: any) => {
      const events = [...prev.events];
      const lineup = [...events[eventIdx].lineup];
      lineup[lineupIdx] = { ...lineup[lineupIdx], [key]: val };
      events[eventIdx] = { ...events[eventIdx], lineup };
      return { ...prev, events };
    });
  };
  const addDJEvent = () => {
    setTempConfigData((prev: any) => ({
      ...prev,
      events: [...prev.events, { name: "", lineup: [] }]
    }));
  };
  const deleteDJEvent = (eventIdx: number) => {
    setTempConfigData((prev: any) => ({
      ...prev,
      events: prev.events.filter((_: any, i: number) => i !== eventIdx)
    }));
  };
  const addDJLineupItem = (eventIdx: number) => {
    setTempConfigData((prev: any) => {
      const events = [...prev.events];
      events[eventIdx] = {
        ...events[eventIdx],
        lineup: [...events[eventIdx].lineup, { time: "", dj: "" }]
      };
      return { ...prev, events };
    });
  };
  const deleteDJLineupItem = (eventIdx: number, lineupIdx: number) => {
    setTempConfigData((prev: any) => {
      const events = [...prev.events];
      events[eventIdx] = {
        ...events[eventIdx],
        lineup: events[eventIdx].lineup.filter((_: any, i: number) => i !== lineupIdx)
      };
      return { ...prev, events };
    });
  };

  // Admin whitelist helpers
  const updateAdminItem = (idx: number, key: string, val: any) => {
    setTempConfigData((prev: any) => {
      const admins = [...prev.admins];
      admins[idx] = { ...admins[idx], [key]: val };
      return { ...prev, admins };
    });
  };
  const addAdminItem = () => {
    setTempConfigData((prev: any) => ({
      ...prev,
      admins: [...prev.admins, { first: "", last: "" }]
    }));
  };
  const deleteAdminItem = (idx: number) => {
    setTempConfigData((prev: any) => ({
      ...prev,
      admins: prev.admins.filter((_: any, i: number) => i !== idx)
    }));
  };

  useEffect(() => {
    // Check local storage for guest login
    const savedGuest = localStorage.getItem("wedding_guest");
    if (savedGuest) {
      try {
        const guest: Guest = JSON.parse(savedGuest);
        setGuestSession(guest);
        
        // Admin verification names
        const adminNames = adminConfig.admins;
        
        const isNameAdmin = adminNames.some(
          (a: any) => a.first === guest.first_name.toLowerCase().trim() &&
                      a.last === guest.last_name.toLowerCase().trim()
        );
        
        // Asynchronously check database mappings
        const verifyAdmin = async () => {
          try {
            const [localGuestGroups, localGroups] = await Promise.all([
              mockDatabase.getGuestGroups(),
              mockDatabase.getGroups()
            ]);
            const localAdminGroup = localGroups.find(g => g.name.toLowerCase() === "admin");
            
            const isGroupAdmin = localAdminGroup && localGuestGroups.some(
              gg => gg.guest_id === guest.id && gg.group_id === localAdminGroup.id
            );
            
            if (isNameAdmin || isGroupAdmin) {
              setIsAdmin(true);
              
              // Check if passcode was already verified in this session
              const verified = sessionStorage.getItem("wedding_admin_passcode_verified");
              if (verified === "true") {
                setIsAuthenticated(true);
                await refreshData();
              }
            }
          } catch (err) {
            console.error("Failed admin check:", err);
          } finally {
            setIsCheckingAuth(false);
          }
        };

        verifyAdmin();
        return;
      } catch (err) {
        console.error("Failed to parse guest session:", err);
      }
    }
    setIsCheckingAuth(false);
  }, [adminConfig]);

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === adminConfig.passcode) {
      setIsAuthenticated(true);
      sessionStorage.setItem("wedding_admin_passcode_verified", "true");
      sessionStorage.setItem("wedding_admin_passcode", passcode);
      await refreshData();
      setPasscodeError("");
    } else {
      setPasscodeError("Incorrect passcode.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    sessionStorage.removeItem("wedding_admin_passcode_verified");
    sessionStorage.removeItem("wedding_admin_passcode");
    localStorage.removeItem("wedding_guest");
    setGuestSession(null);
    window.location.href = "/";
  };

  // CRUD GUESTS
  const handleSaveGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const guestId = isEditingGuest ? isEditingGuest.id : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `guest-${Date.now()}`);
      
      const finalPartyId = newGuestData.party_id || null;
      
      const guestToSave: Guest = {
        id: guestId,
        first_name: newGuestData.first_name.trim(),
        last_name: newGuestData.last_name.trim(),
        email: newGuestData.email.trim() || null,
        phone: newGuestData.phone.trim() || null,
        party_id: finalPartyId,
        address: newGuestData.address.trim() || null,
        rsvp_status: newGuestData.rsvp_status,
        notes: newGuestData.notes.trim() || null,
        is_plus_one: newGuestData.is_plus_one,
        parent_guest_id: newGuestData.parent_guest_id || null,
        plus_ones_allowed: Number(newGuestData.plus_ones_allowed) || 0,
        age: newGuestData.age,
        needs_highchair: newGuestData.needs_highchair,
        in_wheelchair: newGuestData.in_wheelchair
      };

      // Save guest to database
      await mockDatabase.saveGuest(guestToSave);

      // Update group mappings
      // 1. Remove all old group links for this guest
      const currentMappings = guestGroups.filter(gg => gg.guest_id === guestId);
      for (const gg of currentMappings) {
        await mockDatabase.removeGuestFromGroup(guestId, gg.group_id);
      }

      // 2. Add selected ones
      for (const groupId of newGuestData.selectedGroups) {
        await mockDatabase.addGuestToGroup(guestId, groupId);
      }

      // Clean up state
      setShowAddGuest(false);
      setIsEditingGuest(null);
      setNewGuestData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        party_id: "",
        rsvp_status: "pending",
        notes: "",
        selectedGroups: [],
        is_plus_one: false,
        parent_guest_id: "",
        plus_ones_allowed: 0,
        age: "Adult",
        needs_highchair: false,
        in_wheelchair: false,
        address: ""
      });
      
      await refreshData();
    } catch (err: any) {
      console.error("Failed to save guest:", err);
      alert(`Failed to save guest: ${err?.message || JSON.stringify(err)}`);
    }
  };

  const handleEditGuestClick = (guest: Guest) => {
    const matchedGroups = guestGroups
      .filter(gg => gg.guest_id === guest.id)
      .map(gg => gg.group_id);

    setIsEditingGuest(guest);
    setNewGuestData({
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email || "",
      phone: guest.phone || "",
      party_id: guest.party_id || "",
      rsvp_status: guest.rsvp_status,
      notes: guest.notes || "",
      selectedGroups: matchedGroups,
      is_plus_one: guest.is_plus_one || false,
      parent_guest_id: guest.parent_guest_id || "",
      plus_ones_allowed: guest.plus_ones_allowed || 0,
      age: guest.age || "Adult",
      needs_highchair: !!guest.needs_highchair,
      in_wheelchair: !!guest.in_wheelchair,
      address: guest.address || ""
    });
    setShowAddGuest(true);
  };

  const handleDeleteGuest = async (id: string) => {
    if (confirm("Are you sure you want to delete this guest? All their RSVP settings and group links will be removed.")) {
      await mockDatabase.deleteGuest(id);
      await refreshData();
    }
  };

  // CRUD PARTIES
  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;

    const partyId = isEditingParty ? isEditingParty.id : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `party-${Date.now()}`);

    const partyToSave: Party = {
      id: partyId,
      name: newPartyName.trim()
    };
    await mockDatabase.saveParty(partyToSave);

    // Save household members reassignments
    const originalMembers = guests.filter(g => g.party_id === partyId);
    const tempMemberIds = tempPartyMembers.map(m => m.id);

    // Add selected ones
    for (const g of tempPartyMembers) {
      if (g.party_id !== partyId) {
        const updated = { ...g, party_id: partyId };
        await mockDatabase.saveGuest(updated);
      }
    }

    // Remove ones that were deselected
    for (const g of originalMembers) {
      if (!tempMemberIds.includes(g.id)) {
        const updated = { ...g, party_id: null };
        await mockDatabase.saveGuest(updated);
      }
    }

    setNewPartyName("");
    setIsEditingParty(null);
    setTempPartyMembers([]);
    setSelectedGuestToAdd("");
    setShowAddParty(false);
    await refreshData();
  };

  const handleEditPartyClick = (party: Party) => {
    setIsEditingParty(party);
    setNewPartyName(party.name);
    const members = guests.filter(g => g.party_id === party.id);
    setTempPartyMembers(members);
    setShowAddParty(true);
  };


  const handleDeleteParty = async (id: string) => {
    if (confirm("Are you sure you want to delete this party? Household members will remain in the database as individuals (No Party).")) {
      await mockDatabase.deleteParty(id);
      await refreshData();
    }
  };

  // CRUD EVENTS
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const eventId = isEditingEvent ? isEditingEvent.id : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `event-${Date.now()}`);

    const eventToSave: Event = {
      id: eventId,
      title: newEventData.title.trim(),
      description: newEventData.description.trim() || null,
      date: newEventData.date,
      start_time: newEventData.start_time.includes(":") && newEventData.start_time.split(":").length === 2 ? `${newEventData.start_time}:00` : newEventData.start_time,
      end_time: newEventData.end_time ? (newEventData.end_time.includes(":") && newEventData.end_time.split(":").length === 2 ? `${newEventData.end_time}:00` : newEventData.end_time) : null,
      location: newEventData.location.trim(),
      dress_code: newEventData.dress_code.trim() || null,
      is_public: newEventData.is_public,
      group_id: newEventData.is_public ? null : (newEventData.group_id || null)
    };

    await mockDatabase.saveEvent(eventToSave);

    // Clean up
    setShowAddEvent(false);
    setIsEditingEvent(null);
    setNewEventData({
      title: "",
      description: "",
      date: "",
      start_time: "",
      end_time: "",
      location: "",
      dress_code: "",
      is_public: true,
      group_id: ""
    });

    await refreshData();
  };

  const handleEditEventClick = (event: Event) => {
    setIsEditingEvent(event);
    
    // Convert time format HH:mm:ss to HH:mm for HTML inputs
    const formatTimeForInput = (t: string | null) => {
      if (!t) return "";
      const parts = t.split(":");
      return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
    };

    setNewEventData({
      title: event.title,
      description: event.description || "",
      date: event.date,
      start_time: formatTimeForInput(event.start_time),
      end_time: formatTimeForInput(event.end_time),
      location: event.location,
      dress_code: event.dress_code || "",
      is_public: event.is_public,
      group_id: event.group_id || ""
    });
    setShowAddEvent(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm("Are you sure you want to delete this event? This will also remove all guest RSVPs for this event.")) {
      await mockDatabase.deleteEvent(id);
      await refreshData();
    }
  };

  // AISLE PLANNER CSV EXPORT
  const handleExportCSV = async () => {
    // Generate AP mapped rows
    const mealsConfig = await mockDatabase.getSiteConfig("meals", mealsConfigDefault);
    const formattedRows = exportToAislePlanner(guests, parties, groups, guestGroups, guestEvents, events, exportLayout, mealsConfig);
    const csvContent = convertToAislePlannerCSV(formattedRows);

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wedding_guest_list_aisle_planner_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      const success = await mockDatabase.importBackupJSON(result);
      if (success) {
        alert("Database restored successfully from file!");
        await refreshData();
      } else {
        alert("Failed to restore: Invalid backup file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadJSON = async () => {
    const dataStr = await mockDatabase.exportDatabaseJSON();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wedding_db_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncSupabaseToLocal = async () => {
    if (!confirm("Are you sure you want to download current Supabase data and overwrite your local JSON configuration files? This will overwrite your local configuration files (in config/db/ and config/ui/) with the data currently stored in Supabase.")) {
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync-supabase-to-local", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(data.message + (data.files ? `\n\nUpdated files: ${data.files.join(", ")}` : ""));
      } else {
        alert("Error during sync: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      alert("Failed to reach sync API: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateManualBackup = async () => {
    const description = prompt("Enter a description for this restore point:", `Manual Restore Point`);
    if (description === null) return; // user cancelled
    
    setIsSyncing(true);
    try {
      const success = await mockDatabase.createBackup(description || "Manual Restore Point");
      if (success) {
        alert("Restore point created successfully!");
        await refreshData();
      } else {
        alert("Failed to create restore point.");
      }
    } catch (err: any) {
      console.error("Backup creation error:", err);
      alert("Failed to create backup: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreBackup = async (id: string, action: string) => {
    if (confirm(`Are you sure you want to restore the database to this state? (Action: ${action}). Any changes made since this backup was taken will be overwritten.`)) {
      const success = await mockDatabase.restoreBackup(id);
      if (success) {
        alert("Database restored successfully!");
        await refreshData();
      } else {
        alert("Failed to restore backup.");
      }
    }
  };

  // Helper getters
  const getPartyName = (partyId: string | null) => {
    if (!partyId) return "No Party / Individual";
    return parties.find(p => p.id === partyId)?.name || "Unknown Party";
  };

  const getGuestGroupNameList = (guestId: string) => {
    return guestGroups
      .filter(gg => gg.guest_id === guestId)
      .map(gg => groups.find(g => g.id === gg.group_id)?.name)
      .filter(Boolean)
      .join(", ") || "-";
  };

  const getGuestGroupsList = (guestId: string) => {
    return guestGroups
      .filter(gg => gg.guest_id === guestId)
      .map(gg => groups.find(g => g.id === gg.group_id))
      .filter((g): g is Group => !!g);
  };

  const handleSort = (field: "last_name" | "first_name" | "rsvp_status" | "party_name" | "plus_ones" | "group") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortedGuests = () => {
    return [...guests].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortField === "last_name") {
        valA = a.last_name.toLowerCase();
        valB = b.last_name.toLowerCase();
        if (valA === valB) {
          return sortDirection === "asc" 
            ? a.first_name.toLowerCase().localeCompare(b.first_name.toLowerCase())
            : b.first_name.toLowerCase().localeCompare(a.first_name.toLowerCase());
        }
      } else if (sortField === "first_name") {
        valA = a.first_name.toLowerCase();
        valB = b.first_name.toLowerCase();
        if (valA === valB) {
          return sortDirection === "asc"
            ? a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase())
            : b.last_name.toLowerCase().localeCompare(a.last_name.toLowerCase());
        }
      } else if (sortField === "rsvp_status") {
        valA = a.rsvp_status;
        valB = b.rsvp_status;
      } else if (sortField === "party_name") {
        valA = getPartyName(a.party_id).toLowerCase();
        valB = getPartyName(b.party_id).toLowerCase();
      } else if (sortField === "plus_ones") {
        valA = a.plus_ones_allowed || 0;
        valB = b.plus_ones_allowed || 0;
      } else if (sortField === "group") {
        const groupsA = getGuestGroupsList(a.id);
        const groupsB = getGuestGroupsList(b.id);
        valA = groupsA.length > 0 ? groupsA[0].name.toLowerCase() : "";
        valB = groupsB.length > 0 ? groupsB[0].name.toLowerCase() : "";
      }

      if (typeof valA === "string") {
        return sortDirection === "asc" 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc"
          ? (valA > valB ? 1 : valA < valB ? -1 : 0)
          : (valB > valA ? 1 : valB < valA ? -1 : 0);
      }
    });
  };

  const renderSortIcon = (field: "last_name" | "first_name" | "rsvp_status" | "party_name" | "plus_ones" | "group") => {
    if (sortField !== field) {
      return <ArrowUpDown size={10} className="inline ml-1 opacity-30 group-hover:opacity-75 transition-opacity" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp size={10} className="inline ml-1 text-sage" />;
    }
    return <ArrowDown size={10} className="inline ml-1 text-sage" />;
  };

  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 bg-cream flex items-center justify-center p-6 select-none z-[200]">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const hasSession = !!guestSession;
    
    // Scenario 1: Not logged in at all
    if (!hasSession) {
      return (
        <div className="fixed inset-0 bg-cream flex items-center justify-center p-6 select-none z-[200]">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md w-full bg-white border border-sage/20 p-8 md:p-10 shadow-sm text-center"
          >
            <Lock className="w-10 h-10 text-sage mx-auto mb-4" />
            <h1 className="text-3xl font-serif text-charcoal mb-2">Access Restricted</h1>
            <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-charcoal/50 mb-6">Administrators Only</p>
            
            <p className="text-xs text-charcoal/70 font-sans tracking-wide leading-relaxed mb-8">
              You must log in to the wedding website first. Only registered administrators can access this page.
            </p>

            <button
              onClick={() => window.location.href = "/"}
              className="w-full py-4.5 bg-sage text-white font-sans text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-sage/90 transition-all font-semibold rounded-sm cursor-pointer"
            >
              Go to Login
            </button>
          </motion.div>
        </div>
      );
    }

    // Scenario 2: Logged in, but NOT an admin
    if (!isAdmin) {
      return (
        <div className="fixed inset-0 bg-cream flex items-center justify-center p-6 select-none z-[200]">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md w-full bg-white border border-sage/20 p-8 md:p-10 shadow-sm text-center"
          >
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
            <h1 className="text-3xl font-serif text-charcoal mb-2">Access Denied</h1>
            <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-rose-500 mb-6">Hello, {guestSession.first_name}</p>
            
            <p className="text-xs text-charcoal/70 font-sans tracking-wide leading-relaxed mb-8">
              This dashboard is reserved for wedding administrators. Your account does not have access permissions. If you believe this is an error, please contact the hosts.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.href = "/"}
                className="w-full py-4 bg-sage text-white font-sans text-[10px] uppercase tracking-[0.2em] shadow-sm hover:bg-sage/90 transition-all font-semibold rounded-sm cursor-pointer"
              >
                Return to Website
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-3.5 border border-sage/35 text-sage font-sans text-[10px] uppercase tracking-[0.2em] hover:bg-sage/5 transition-all font-medium rounded-sm cursor-pointer"
              >
                Switch Account
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    // Scenario 3: Logged in AND is admin, but passcode is not verified yet
    return (
      <div className="fixed inset-0 bg-cream flex items-center justify-center p-6 select-none z-[200]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md w-full bg-white border border-sage/20 p-8 md:p-10 shadow-sm text-center"
        >
          <Lock className="w-10 h-10 text-sage mx-auto mb-4" />
          <h1 className="text-3xl font-serif text-charcoal mb-2">Verification Required</h1>
          <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-charcoal/50 mb-6">Hello, {guestSession.first_name}</p>

          <form onSubmit={handleAuthenticate} className="space-y-6">
            <div className="text-left">
              <label className="block font-sans text-[9px] uppercase tracking-widest text-charcoal/50 mb-2 font-semibold">Enter Admin Passcode</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full border-b border-sage/40 bg-transparent py-3 outline-none text-center font-serif text-2xl tracking-[0.5em] focus:border-sage transition-colors text-charcoal"
                placeholder="••••••••"
                autoFocus
              />
            </div>

            {passcodeError && (
              <p className="text-xs text-red-500 font-sans tracking-wide leading-relaxed">{passcodeError}</p>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                className="w-full py-4 bg-sage text-white font-sans text-xs uppercase tracking-[0.2em] shadow-sm hover:bg-sage/90 transition-all font-semibold rounded-sm cursor-pointer"
              >
                Verify Passcode
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3.5 border border-sage/35 text-sage font-sans text-[10px] uppercase tracking-[0.2em] hover:bg-sage/5 transition-all font-medium rounded-sm cursor-pointer"
              >
                Cancel / Logout
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  const renderGeneralSection = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Partner 1 Name</label>
            <input
              type="text"
              value={tempConfigData.partner1 || ""}
              onChange={e => updateField("partner1", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Partner 2 Name</label>
            <input
              type="text"
              value={tempConfigData.partner2 || ""}
              onChange={e => updateField("partner2", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Wedding Date Display (e.g. April 3, 2027)</label>
            <input
              type="text"
              value={tempConfigData.date || ""}
              onChange={e => updateField("date", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Wedding Date Value (YYYY-MM-DD)</label>
            <input
              type="date"
              value={tempConfigData.raw_date || ""}
              onChange={e => updateField("raw_date", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Location Name (e.g. Indio, California)</label>
          <input
            type="text"
            value={tempConfigData.location_name || ""}
            onChange={e => updateField("location_name", e.target.value)}
            className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Invite Message (Home screen landing page)</label>
          <input
            type="text"
            value={tempConfigData.invite_message || ""}
            onChange={e => updateField("invite_message", e.target.value)}
            className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">RSVP Prompt (Home screen RSVP action button description)</label>
          <input
            type="text"
            value={tempConfigData.rsvp_prompt || ""}
            onChange={e => updateField("rsvp_prompt", e.target.value)}
            className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">RSVP Go-Live Date (Leave blank to open RSVP immediately)</label>
          <input
            type="date"
            value={tempConfigData.rsvp_open_date || ""}
            onChange={e => updateField("rsvp_open_date", e.target.value)}
            className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">RSVP Deadline Message</label>
          <input
            type="text"
            value={tempConfigData.rsvp_deadline_message || ""}
            onChange={e => updateField("rsvp_deadline_message", e.target.value)}
            className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            placeholder="e.g. Please let us know your plans by October 1st."
          />
        </div>
      </div>
    );
  };

  const renderStorySection = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Title</label>
            <input
              type="text"
              value={tempConfigData.title || ""}
              onChange={e => updateField("title", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Subtitle</label>
            <input
              type="text"
              value={tempConfigData.subtitle || ""}
              onChange={e => updateField("subtitle", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
        </div>

        <div className="border-t border-sage/15 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-charcoal">Timeline Steps</h3>
            <button
              onClick={addTimelineItem}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sage text-sage uppercase tracking-wider text-[10px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
            >
              <Plus size={11} />
              Add Story Event
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {(tempConfigData.timeline || []).map((item: any, idx: number) => (
              <div key={idx} className="bg-cream/15 border border-sage/15 p-4 rounded-sm relative group space-y-3">
                <button
                  onClick={() => deleteTimelineItem(idx)}
                  className="absolute top-4 right-4 p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Remove story event"
                >
                  <Trash2 size={14} />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-8">
                  <div className="md:col-span-1">
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Year/Date (e.g. August 2017)</label>
                    <input
                      type="text"
                      value={item.year || ""}
                      onChange={e => updateTimelineItem(idx, "year", e.target.value)}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Event Title</label>
                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={e => updateTimelineItem(idx, "title", e.target.value)}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Description Text</label>
                  <textarea
                    value={item.description || ""}
                    onChange={e => updateTimelineItem(idx, "description", e.target.value)}
                    className="w-full border border-sage/25 p-2 bg-white text-xs outline-none focus:border-sage h-20 resize-none rounded-sm"
                  />
                </div>
              </div>
            ))}

            {(tempConfigData.timeline || []).length === 0 && (
              <p className="text-xs text-charcoal/40 italic py-6 text-center">No timeline events defined. Click 'Add Story Event' to build your timeline.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFAQSection = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Title</label>
            <input
              type="text"
              value={tempConfigData.title || ""}
              onChange={e => updateField("title", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Subtitle</label>
            <input
              type="text"
              value={tempConfigData.subtitle || ""}
              onChange={e => updateField("subtitle", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
        </div>

        <div className="border-t border-sage/15 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-charcoal">FAQ Q&A Cards</h3>
            <button
              onClick={addFAQItem}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sage text-sage uppercase tracking-wider text-[10px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
            >
              <Plus size={11} />
              Add FAQ Item
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {(tempConfigData.list || []).map((item: any, idx: number) => (
              <div key={idx} className="bg-cream/15 border border-sage/15 p-4 rounded-sm relative group space-y-3">
                <button
                  onClick={() => deleteFAQItem(idx)}
                  className="absolute top-4 right-4 p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Remove FAQ question"
                >
                  <Trash2 size={14} />
                </button>

                <div className="pr-8">
                  <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Question</label>
                  <input
                    type="text"
                    value={item.q || ""}
                    onChange={e => updateFAQItem(idx, "q", e.target.value)}
                    className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                    placeholder="e.g. What is the dress code?"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Answer</label>
                  <textarea
                    value={item.a || ""}
                    onChange={e => updateFAQItem(idx, "a", e.target.value)}
                    className="w-full border border-sage/25 p-2 bg-white text-xs outline-none focus:border-sage h-28 resize-y rounded-sm"
                    placeholder="Provide details..."
                  />
                </div>
              </div>
            ))}

            {(tempConfigData.list || []).length === 0 && (
              <p className="text-xs text-charcoal/40 italic py-6 text-center">No FAQs defined. Click 'Add FAQ Item' to create questions.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTravelSection = () => {
    return (
      <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Title</label>
            <input
              type="text"
              value={tempConfigData.title || ""}
              onChange={e => updateField("title", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Description</label>
            <input
              type="text"
              value={tempConfigData.description || ""}
              onChange={e => updateField("description", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
        </div>

        {/* Airports sub-section */}
        <div className="border-t border-sage/15 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-serif text-charcoal flex items-center gap-1.5">
              <Plane size={15} className="text-sage" />
              Airports List
            </h3>
            <button
              onClick={addAirportItem}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-sage text-sage uppercase tracking-wider text-[9px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
            >
              <Plus size={10} />
              Add Airport
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(tempConfigData.airports || []).map((item: any, idx: number) => (
              <div key={idx} className="bg-cream/10 border border-sage/10 p-4 rounded-sm relative space-y-2">
                <button
                  onClick={() => deleteAirportItem(idx)}
                  className="absolute top-2 right-2 p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-6">
                  <div>
                    <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-semibold mb-0.5">Airport Title</label>
                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={e => updateAirportItem(idx, "title", e.target.value)}
                      className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none rounded-sm"
                      placeholder="e.g. Palm Springs (PSP)"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-semibold mb-0.5">Tag / Distance</label>
                    <input
                      type="text"
                      value={item.tag || ""}
                      onChange={e => updateAirportItem(idx, "tag", e.target.value)}
                      className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none rounded-sm"
                      placeholder="e.g. Closest Option"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-semibold mb-0.5">Description</label>
                  <textarea
                    value={item.description || ""}
                    onChange={e => updateAirportItem(idx, "description", e.target.value)}
                    className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none h-14 resize-none rounded-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hotels sub-section */}
        <div className="border-t border-sage/15 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-serif text-charcoal flex items-center gap-1.5">
              <Bed size={15} className="text-sage" />
              Hotels & Accommodation
            </h3>
            <button
              onClick={addHotelItem}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-sage text-sage uppercase tracking-wider text-[9px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
            >
              <Plus size={10} />
              Add Hotel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(tempConfigData.hotels || []).map((item: any, idx: number) => (
              <div key={idx} className="bg-cream/10 border border-sage/10 p-4 rounded-sm relative space-y-2">
                <button
                  onClick={() => deleteHotelItem(idx)}
                  className="absolute top-2 right-2 p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>

                <div className="pr-6">
                  <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-semibold mb-0.5">Hotel Name</label>
                  <input
                    type="text"
                    value={item.title || ""}
                    onChange={e => updateHotelItem(idx, "title", e.target.value)}
                    className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none rounded-sm"
                    placeholder="e.g. La Quinta Resort"
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-semibold mb-0.5">Booking Link</label>
                  <input
                    type="url"
                    value={item.book_url || ""}
                    onChange={e => updateHotelItem(idx, "book_url", e.target.value)}
                    className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none rounded-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-semibold mb-0.5">Short Description</label>
                  <textarea
                    value={item.description || ""}
                    onChange={e => updateHotelItem(idx, "description", e.target.value)}
                    className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none h-14 resize-none rounded-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Favorites sub-section */}
        <div className="border-t border-sage/15 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-serif text-charcoal flex items-center gap-1.5">
              <MapPin size={15} className="text-sage" />
              Favorite Local Activities
            </h3>
            <button
              onClick={addFavoriteItem}
              className="flex items-center gap-1 px-2.5 py-1.5 border border-sage text-sage uppercase tracking-wider text-[9px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
            >
              <Plus size={10} />
              Add Favorite
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(tempConfigData.favorites || []).map((item: any, idx: number) => (
              <div key={idx} className="bg-cream/10 border border-sage/10 p-4 rounded-sm relative space-y-2">
                <button
                  onClick={() => deleteFavoriteItem(idx)}
                  className="absolute top-2 right-2 p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-6">
                  <div>
                    <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-semibold mb-0.5">Activity Title</label>
                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={e => updateFavoriteItem(idx, "title", e.target.value)}
                      className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none rounded-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-semibold mb-0.5">Icon ID</label>
                    <input
                      type="text"
                      value={item.icon || "MapPin"}
                      onChange={e => updateFavoriteItem(idx, "icon", e.target.value)}
                      className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none rounded-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-semibold mb-0.5">Description</label>
                  <textarea
                    value={item.description || ""}
                    onChange={e => updateFavoriteItem(idx, "description", e.target.value)}
                    className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none h-14 resize-none rounded-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRegistrySection = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Title</label>
            <input
              type="text"
              value={tempConfigData.title || ""}
              onChange={e => updateField("title", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Description</label>
            <input
              type="text"
              value={tempConfigData.description || ""}
              onChange={e => updateField("description", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
        </div>

        <div className="border-t border-sage/15 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-charcoal">Registry Funds & Links</h3>
            <button
              onClick={addRegistryFundItem}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sage text-sage uppercase tracking-wider text-[10px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
            >
              <Plus size={11} />
              Add Registry Fund
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {(tempConfigData.funds || []).map((item: any, idx: number) => (
              <div key={idx} className="bg-cream/15 border border-sage/15 p-4 rounded-sm relative group space-y-3">
                <button
                  onClick={() => deleteRegistryFundItem(idx)}
                  className="absolute top-4 right-4 p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Fund Title</label>
                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={e => updateRegistryFundItem(idx, "title", e.target.value)}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                      placeholder="e.g. Honeymoon Fund"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Button Text</label>
                    <input
                      type="text"
                      value={item.button_text || "Send a Gift"}
                      onChange={e => updateRegistryFundItem(idx, "button_text", e.target.value)}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Icon Type (Heart | Gift)</label>
                    <input
                      type="text"
                      value={item.icon || "Heart"}
                      onChange={e => updateRegistryFundItem(idx, "icon", e.target.value)}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Registry URL</label>
                  <input
                    type="url"
                    value={item.url || ""}
                    onChange={e => updateRegistryFundItem(idx, "url", e.target.value)}
                    className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                    placeholder="https://www.zola.com/registry/..."
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Short Description</label>
                  <textarea
                    value={item.description || ""}
                    onChange={e => updateRegistryFundItem(idx, "description", e.target.value)}
                    className="w-full border border-sage/25 p-2 bg-white text-xs outline-none focus:border-sage h-16 resize-none rounded-sm"
                  />
                </div>
              </div>
            ))}

            {(tempConfigData.funds || []).length === 0 && (
              <p className="text-xs text-charcoal/40 italic py-6 text-center">No registry funds defined. Click 'Add Registry Fund' to create links.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMapSection = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Default Zoom Level</label>
            <input
              type="number"
              value={tempConfigData.zoom || 10}
              onChange={e => updateField("zoom", Number(e.target.value))}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Center Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={tempConfigData.center?.[0] || 0}
              onChange={e => {
                const lng = Number(e.target.value);
                const currentCenter = tempConfigData.center || [0, 0];
                updateField("center", [lng, currentCenter[1]]);
              }}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Center Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={tempConfigData.center?.[1] || 0}
              onChange={e => {
                const lat = Number(e.target.value);
                const currentCenter = tempConfigData.center || [0, 0];
                updateField("center", [currentCenter[0], lat]);
              }}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
        </div>

        <div className="border-t border-sage/15 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-charcoal">Map Pin Markers</h3>
            <button
              onClick={addMapLocationItem}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sage text-sage uppercase tracking-wider text-[10px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
            >
              <Plus size={11} />
              Add Map Marker
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {(tempConfigData.locations || []).map((item: any, idx: number) => (
              <div key={idx} className="bg-cream/15 border border-sage/15 p-4 rounded-sm relative group space-y-3">
                <button
                  onClick={() => deleteMapLocationItem(idx)}
                  className="absolute top-4 right-4 p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Marker ID (Unique String)</label>
                    <input
                      type="text"
                      value={item.id || ""}
                      onChange={e => updateMapLocationItem(idx, "id", e.target.value)}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                      placeholder="e.g. restaurant-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Location / Marker Name</label>
                    <input
                      type="text"
                      value={item.name || ""}
                      onChange={e => updateMapLocationItem(idx, "name", e.target.value)}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                      placeholder="e.g. Lavender Bistro"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Address (Type & Click Geocode to Auto-fill Lat/Lng)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. 123 Main St, La Quinta, CA"
                        className="flex-1 border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            geocodeAddress(idx, (e.target as HTMLInputElement).value);
                          }
                        }}
                        id={`geocode-input-${idx}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(`geocode-input-${idx}`) as HTMLInputElement;
                          if (input) geocodeAddress(idx, input.value);
                        }}
                        disabled={geocodingIdx === idx}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-olive/40 text-olive uppercase tracking-wider text-[9px] rounded-sm hover:bg-olive hover:text-white transition-all cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                        {geocodingIdx === idx ? (
                          <><Loader2 size={11} className="animate-spin" /> Geocoding...</>
                        ) : (
                          <><Search size={11} /> Geocode</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={item.lat || 0}
                      onChange={e => updateMapLocationItem(idx, "lat", Number(e.target.value))}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={item.lng || 0}
                      onChange={e => updateMapLocationItem(idx, "lng", Number(e.target.value))}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Type Category</label>
                    <select
                      value={item.type || "Activities"}
                      onChange={e => updateMapLocationItem(idx, "type", e.target.value)}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                    >
                      <option value="Venue">Venue</option>
                      <option value="Airport">Airport</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Golf">Golf</option>
                      <option value="Activities">Activities</option>
                      <option value="Restaurant">Restaurant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Color Hex (e.g. #EF4444)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={item.color || "#38BDF8"}
                        onChange={e => updateMapLocationItem(idx, "color", e.target.value)}
                        className="w-8 h-8 border border-sage/25 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={item.color || ""}
                        onChange={e => updateMapLocationItem(idx, "color", e.target.value)}
                        className="flex-1 border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Icon Type (Plane | Bed | Utensils | Home etc.)</label>
                    <input
                      type="text"
                      value={item.icon || "MapPin"}
                      onChange={e => updateMapLocationItem(idx, "icon", e.target.value)}
                      className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                      placeholder="e.g. Home, Bed, Utensils"
                    />
                  </div>
                </div>
              </div>
            ))}

            {(tempConfigData.locations || []).length === 0 && (
              <p className="text-xs text-charcoal/40 italic py-6 text-center">No map locations defined. Click 'Add Map Marker' to build pins.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDJSection = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Title</label>
            <input
              type="text"
              value={tempConfigData.title || ""}
              onChange={e => updateField("title", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Subtitle</label>
            <input
              type="text"
              value={tempConfigData.subtitle || ""}
              onChange={e => updateField("subtitle", e.target.value)}
              className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
            />
          </div>
        </div>

        <div className="border-t border-sage/15 pt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-charcoal">DJ Lineups by Event</h3>
            <button
              onClick={addDJEvent}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sage text-sage uppercase tracking-wider text-[10px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
            >
              <Plus size={11} />
              Add Event Section
            </button>
          </div>

          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
            {(tempConfigData.events || []).map((event: any, eventIdx: number) => (
              <div key={eventIdx} className="bg-cream/15 border border-sage/15 p-5 rounded-sm relative group space-y-4">
                <button
                  onClick={() => deleteDJEvent(eventIdx)}
                  className="absolute top-4 right-4 p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Remove event lineup section"
                >
                  <Trash2 size={14} />
                </button>

                <div className="pr-8 max-w-sm">
                  <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Event Name (e.g. Welcome Party)</label>
                  <input
                    type="text"
                    value={event.name || ""}
                    onChange={e => updateDJEventName(eventIdx, e.target.value)}
                    className="w-full border border-sage/25 p-1.5 bg-white text-xs font-semibold outline-none focus:border-sage rounded-sm"
                  />
                </div>

                <div className="space-y-2 pl-4 border-l border-sage/20">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] uppercase tracking-widest text-charcoal/50 font-bold">Lineup Set Times</p>
                    <button
                      onClick={() => addDJLineupItem(eventIdx)}
                      className="flex items-center gap-0.5 px-2 py-1 border border-sage/50 text-sage uppercase tracking-wider text-[8px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
                    >
                      <Plus size={8} />
                      Add Artist
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(event.lineup || []).map((lineup: any, lineupIdx: number) => (
                      <div key={lineupIdx} className="flex gap-4 items-center bg-white p-2 border border-sage/10 rounded-sm">
                        <div className="w-24 sm:w-28 shrink-0">
                          <label className="block text-[7px] uppercase tracking-widest text-charcoal/30 font-bold mb-0.5">Time (e.g. 5:00 PM)</label>
                          <input
                            type="text"
                            value={lineup.time || ""}
                            onChange={e => updateDJLineupItem(eventIdx, lineupIdx, "time", e.target.value)}
                            className="w-full border border-sage/20 p-1 bg-cream/10 text-xs outline-none rounded-sm"
                            placeholder="5:00 PM"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[7px] uppercase tracking-widest text-charcoal/30 font-bold mb-0.5">Artist / DJ Name</label>
                          <input
                            type="text"
                            value={lineup.dj || ""}
                            onChange={e => updateDJLineupItem(eventIdx, lineupIdx, "dj", e.target.value)}
                            className="w-full border border-sage/20 p-1 bg-cream/10 text-xs outline-none rounded-sm"
                            placeholder="Alexis F"
                          />
                        </div>
                        <button
                          onClick={() => deleteDJLineupItem(eventIdx, lineupIdx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer mt-3"
                          title="Remove artist"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {(event.lineup || []).length === 0 && (
                      <p className="text-[10px] text-charcoal/40 italic py-2">No artists added to this event lineup.</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(tempConfigData.events || []).length === 0 && (
              <p className="text-xs text-charcoal/40 italic py-6 text-center">No DJ event lineups defined. Click 'Add Event Section' to begin.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWeekendSection = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Section Title</label>
          <input
            type="text"
            value={tempConfigData.title || ""}
            onChange={e => updateField("title", e.target.value)}
            className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Intro Description Text</label>
          <textarea
            value={tempConfigData.description || ""}
            onChange={e => updateField("description", e.target.value)}
            className="w-full border border-sage/35 p-3 bg-cream/20 text-xs sm:text-sm outline-none focus:border-sage h-32 resize-y rounded-sm"
            placeholder="A gathering in the desert..."
          />
        </div>
      </div>
    );
  };

  const slotsList = [
    { key: "hero", label: "Hero Background" },
    { key: "story", label: "Our Story" },
    { key: "dj_lineup", label: "DJ Lineup" },
    { key: "gallery_teaser", label: "Gallery Teaser" },
    { key: "rsvp", label: "RSVP Background" },
    { key: "registry", label: "Registry Background" },
    { key: "weekend", label: "The Weekend Background" }
  ];

  const renderImagesSection = () => {
    return (
      <div className="space-y-8">
        {/* Slots Assign Grid */}
        <div>
          <h3 className="text-lg font-serif text-charcoal mb-4">Assign Slots</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slotsList.map(slot => {
              const mode = activeViewport[slot.key] || "desktop";
              const suffix = mode === "desktop" ? "" : "m";
              const pxKey = `${slot.key}_x${suffix}`;
              const pyKey = `${slot.key}_y${suffix}`;
              const scaleKey = `${slot.key}_scale${suffix}`;

              const pxVal = tempConfigData[pxKey] ?? 50;
              const pyVal = tempConfigData[pyKey] ?? 50;
              const scaleVal = tempConfigData[scaleKey] ?? 100;

              return (
                <div key={slot.key} className="border border-sage/15 p-4 rounded-sm bg-cream/10 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">{slot.label}</label>
                      <select
                        value={tempConfigData[slot.key] || ""}
                        onChange={e => updateField(slot.key, e.target.value)}
                        className="w-full border border-sage/30 p-2 bg-white text-xs outline-none focus:border-sage rounded-sm"
                      >
                        <option value="">Select an image...</option>
                        {galleryPhotos.map(p => (
                          <option key={p} value={p}>{decodeURIComponent(p.split('/').pop() || '')}</option>
                        ))}
                      </select>
                    </div>

                    {tempConfigData[slot.key] && (
                      <>
                        {/* Viewport Tabs */}
                        <div className="flex gap-2 border-b border-sage/10 pb-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveViewport(prev => ({ ...prev, [slot.key]: "desktop" }))}
                            className={`flex-1 flex items-center justify-center gap-1 py-1 text-[9px] uppercase tracking-wider font-semibold rounded-sm border transition-all cursor-pointer ${
                              mode === "desktop"
                                ? "bg-sage text-cream border-sage animate-fade-in"
                                : "border-sage/20 text-charcoal/65 hover:bg-cream/5"
                            }`}
                          >
                            <Monitor size={10} />
                            Desktop
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveViewport(prev => ({ ...prev, [slot.key]: "mobile" }))}
                            className={`flex-1 flex items-center justify-center gap-1 py-1 text-[9px] uppercase tracking-wider font-semibold rounded-sm border transition-all cursor-pointer ${
                              mode === "mobile"
                                ? "bg-sage text-cream border-sage animate-fade-in"
                                : "border-sage/20 text-charcoal/65 hover:bg-cream/5"
                            }`}
                          >
                            <Smartphone size={10} />
                            Mobile
                          </button>
                        </div>

                        {/* Real-time Preview */}
                        <div className={mode === "desktop" 
                          ? "relative w-full aspect-[16/9] bg-sage/5 rounded-sm border border-sage/10 overflow-hidden mt-1" 
                          : "relative w-[110px] aspect-[9/16] mx-auto bg-sage/5 rounded-sm border border-sage/10 overflow-hidden mt-1"
                        }>
                          <img
                            src={`/_next/image?url=${encodeURIComponent(tempConfigData[slot.key])}&w=640&q=75`}
                            alt={slot.label}
                            style={{
                              objectPosition: `${pxVal}% ${pyVal}%`,
                              transform: `scale(${scaleVal / 100})`,
                            }}
                            className="object-cover w-full h-full transition-all duration-75"
                          />
                        </div>

                        {/* Sliders Control Block */}
                        <div className="space-y-3 pt-1">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] uppercase tracking-wider text-charcoal/50 font-bold">
                              <span>Horizontal Position</span>
                              <span>{pxVal}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={pxVal}
                              onChange={e => updateField(pxKey, parseInt(e.target.value))}
                              className="w-full h-1 bg-sage/20 rounded-lg appearance-none cursor-pointer accent-sage"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] uppercase tracking-wider text-charcoal/50 font-bold">
                              <span>Vertical Position</span>
                              <span>{pyVal}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={pyVal}
                              onChange={e => updateField(pyKey, parseInt(e.target.value))}
                              className="w-full h-1 bg-sage/20 rounded-lg appearance-none cursor-pointer accent-sage"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] uppercase tracking-wider text-charcoal/50 font-bold">
                              <span>Zoom Level</span>
                              <span>{(scaleVal / 100).toFixed(2)}x</span>
                            </div>
                            <input
                              type="range"
                              min="100"
                              max="250"
                              value={scaleVal}
                              onChange={e => updateField(scaleKey, parseInt(e.target.value))}
                              className="w-full h-1 bg-sage/20 rounded-lg appearance-none cursor-pointer accent-sage"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Full Gallery Section */}
        <div className="border-t border-sage/15 pt-6 space-y-4">
          <h3 className="text-lg font-serif text-charcoal">Full Gallery</h3>
          <p className="text-xs text-charcoal/50 leading-relaxed font-sans">
            Here are all the high-resolution engagement photos currently in <code>public/photos/engagement</code>. You can set any image to a website section slot directly using the assign dropdowns on each photo.
          </p>

          {galleryPhotos.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-sage/30 rounded-sm bg-cream/5">
              <p className="text-sm text-charcoal/40 italic">No photos found or loading...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {galleryPhotos.map(photo => {
                // Find slots this photo is currently assigned to
                const assignedSlots = slotsList.filter(s => tempConfigData[s.key] === photo);
                
                return (
                  <div key={photo} className="border border-sage/15 rounded-sm overflow-hidden bg-white shadow-sm flex flex-col justify-between group">
                    <div className="relative w-full aspect-[4/5] bg-sage/5 overflow-hidden">
                      <img
                        src={`/_next/image?url=${encodeURIComponent(photo)}&w=256&q=75`}
                        alt="Gallery preview"
                        className="object-cover w-full h-full"
                        loading="lazy"
                      />
                      
                      {/* Badge Overlays */}
                      {assignedSlots.length > 0 && (
                        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                          {assignedSlots.map(s => (
                            <span key={s.key} className="bg-sage text-white text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm shadow-sm font-semibold">
                              {s.label.replace(" Background", "")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-3 border-t border-sage/10 space-y-2">
                      <p className="text-[9px] font-mono text-charcoal/40 truncate" title={decodeURIComponent(photo.split('/').pop() || '')}>
                        {decodeURIComponent(photo.split('/').pop() || '')}
                      </p>
                      
                      <div className="relative">
                        <select
                          onChange={e => {
                            if (e.target.value) {
                              updateField(e.target.value, photo);
                              e.target.value = ""; // Reset select
                            }
                          }}
                          className="w-full border border-sage/20 p-1.5 bg-cream/5 text-[9px] uppercase tracking-wider outline-none focus:border-sage rounded-sm font-semibold text-sage"
                          defaultValue=""
                        >
                          <option value="" disabled>Assign to slot...</option>
                          {slotsList.map(s => (
                            <option key={s.key} value={s.key}>
                              {s.label} {tempConfigData[s.key] === photo ? " (Current)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMealsSection = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-serif text-charcoal">RSVP Meal Options</h3>
          <button
            onClick={addMealItem}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-sage text-sage uppercase tracking-wider text-[10px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
          >
            <Plus size={11} />
            Add Meal Option
          </button>
        </div>

        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {(tempConfigData.list || []).map((item: any, idx: number) => (
            <div key={idx} className="bg-cream/15 border border-sage/15 p-4 rounded-sm relative group space-y-3">
              <button
                onClick={() => deleteMealItem(idx)}
                className="absolute top-4 right-4 p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                title="Remove meal option"
              >
                <Trash2 size={14} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-8">
                <div className="md:col-span-1">
                  <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Option Key (Unique identifier)</label>
                  <input
                    type="text"
                    value={item.key || ""}
                    onChange={e => updateMealItem(idx, "key", e.target.value)}
                    className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm font-mono"
                    placeholder="e.g. beef, chicken, veg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[9px] uppercase tracking-widest text-charcoal/40 mb-1 font-semibold">Option Display Label</label>
                  <input
                    type="text"
                    value={item.label || ""}
                    onChange={e => updateMealItem(idx, "label", e.target.value)}
                    className="w-full border border-sage/25 p-1.5 bg-white text-xs outline-none focus:border-sage rounded-sm"
                    placeholder="e.g. Braised Short Rib"
                  />
                </div>
              </div>
            </div>
          ))}
          {(tempConfigData.list || []).length === 0 && (
            <div className="text-center py-8 text-xs text-charcoal/40 italic">
              No meal options configured. Guests will not be prompted to choose.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdminSection = () => {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Admin Passcode</label>
          <input
            type="text"
            value={tempConfigData.passcode || ""}
            onChange={e => updateField("passcode", e.target.value)}
            className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm font-mono tracking-widest"
          />
          <p className="text-[10px] text-rose-500/80 mt-1 font-sans">
            ⚠️ Changing this passcode will immediately require all admin sessions to re-authenticate with the new value.
          </p>
        </div>

        <div className="border-t border-sage/15 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-charcoal">Whitelisted Administrators</h3>
            <button
              onClick={addAdminItem}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sage text-sage uppercase tracking-wider text-[10px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold"
            >
              <Plus size={11} />
              Add Administrator
            </button>
          </div>

          <p className="text-[11px] text-charcoal/50 leading-relaxed font-sans">
            Only users with these exact (case-insensitive) names will be recognized as admins when they log in to the main wedding page, allowing them to proceed to this portal.
          </p>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {(tempConfigData.admins || []).map((admin: any, idx: number) => (
              <div key={idx} className="flex gap-4 items-center bg-cream/10 border border-sage/10 p-3 rounded-sm relative pr-10">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-bold mb-0.5">First Name</label>
                    <input
                      type="text"
                      required
                      value={admin.first || ""}
                      onChange={e => updateAdminItem(idx, "first", e.target.value.toLowerCase().trim())}
                      className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none rounded-sm font-serif"
                      placeholder="e.g. alexis"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] uppercase tracking-widest text-charcoal/40 font-bold mb-0.5">Last Name</label>
                    <input
                      type="text"
                      required
                      value={admin.last || ""}
                      onChange={e => updateAdminItem(idx, "last", e.target.value.toLowerCase().trim())}
                      className="w-full border border-sage/20 p-1.5 bg-white text-xs outline-none rounded-sm font-serif"
                      placeholder="e.g. fortini"
                    />
                  </div>
                </div>

                <button
                  onClick={() => deleteAdminItem(idx)}
                  className="absolute right-3 p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Remove administrator"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {(tempConfigData.admins || []).length === 0 && (
              <p className="text-xs text-charcoal/40 italic py-6 text-center">No administrators whitelisted. Warning: you might lock yourself out if you save this!</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-cream text-charcoal font-sans p-4 sm:p-6 md:p-12 selection:bg-sage/20 selection:text-sage">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-sage/25 mb-10 gap-4 md:gap-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="flex items-center justify-center p-2.5 border border-sage/30 text-sage hover:bg-sage hover:text-white rounded-sm transition-all cursor-pointer mr-2"
              title="Return to Website"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-3xl font-serif text-charcoal leading-tight">Alexis & Kelsey</h1>
              <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-charcoal/50 mt-1">Wedding Administration Panel • Cloud Database Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-sans px-3 py-1 bg-olive/10 text-olive rounded-full border border-olive/10 font-medium">
              Guests: {guests.length} | Events: {events.length}
            </span>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-sage/35 text-sage text-xs uppercase tracking-widest rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-medium"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </header>

        {/* Tab Controls */}
        <div className="flex flex-row overflow-x-auto gap-2 mb-8 border-b border-sage/15 pb-4 scrollbar-none">
          <button
            onClick={() => setActiveTab("guests")}
            className={`flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 text-xs uppercase tracking-wider rounded-sm transition-all font-semibold shrink-0 ${
              activeTab === "guests"
                ? "bg-sage text-white shadow-sm"
                : "text-sage hover:bg-sage/5"
            }`}
          >
            <User size={14} />
            Guest List
          </button>
          <button
            onClick={() => setActiveTab("parties")}
            className={`flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 text-xs uppercase tracking-wider rounded-sm transition-all font-semibold shrink-0 ${
              activeTab === "parties"
                ? "bg-sage text-white shadow-sm"
                : "text-sage hover:bg-sage/5"
            }`}
          >
            <Users size={14} />
            Parties
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 text-xs uppercase tracking-wider rounded-sm transition-all font-semibold shrink-0 ${
              activeTab === "events"
                ? "bg-sage text-white shadow-sm"
                : "text-sage hover:bg-sage/5"
            }`}
          >
            <Calendar size={14} />
            Events Schedule
          </button>
          <button
            onClick={() => setActiveTab("export")}
            className={`flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 text-xs uppercase tracking-wider rounded-sm transition-all font-semibold shrink-0 ${
              activeTab === "export"
                ? "bg-sage text-white shadow-sm"
                : "text-sage hover:bg-sage/5"
            }`}
          >
            <FileText size={14} />
            Aisle Planner Export
          </button>
          <button
            onClick={() => setActiveTab("backups")}
            className={`flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 text-xs uppercase tracking-wider rounded-sm transition-all font-semibold shrink-0 ${
              activeTab === "backups"
                ? "bg-sage text-white shadow-sm"
                : "text-sage hover:bg-sage/5"
            }`}
          >
            <History size={14} />
            Backups & Recovery
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-3 text-xs uppercase tracking-wider rounded-sm transition-all font-semibold shrink-0 ${
              activeTab === "settings"
                ? "bg-sage text-white shadow-sm"
                : "text-sage hover:bg-sage/5"
            }`}
          >
            <Sliders size={14} />
            Website Settings
          </button>
        </div>

        {/* TAB 1: GUEST LIST */}
        {activeTab === "guests" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif text-charcoal">Manage Guests</h2>
              <button
                onClick={() => {
                  setIsEditingGuest(null);
                  setNewGuestData({
                    first_name: "",
                    last_name: "",
                    email: "",
                    phone: "",
                    party_id: "",
                    rsvp_status: "pending",
                    notes: "",
                    selectedGroups: [],
                    is_plus_one: false,
                    parent_guest_id: "",
                    plus_ones_allowed: 0,
                    age: "Adult",
                    needs_highchair: false,
                    in_wheelchair: false,
                    address: ""
                  });
                  setShowAddGuest(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-sage text-white text-xs uppercase tracking-widest hover:bg-sage/90 shadow-sm font-semibold rounded-sm cursor-pointer"
              >
                <Plus size={14} />
                Add Guest
              </button>
            </div>

            {/* Guest Form Modal Overlay */}
            {showAddGuest && (
              <div 
                onClick={() => {
                  setShowAddGuest(false);
                  setIsEditingGuest(null);
                }}
                className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <motion.div
                  onClick={e => e.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-sage/20 p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-md rounded-sm"
                >
                  <h3 className="text-2xl font-serif mb-6 text-charcoal">
                    {isEditingGuest ? "Edit Guest details" : "Add New Guest"}
                  </h3>
                  
                  <form onSubmit={handleSaveGuest} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">First Name</label>
                        <input
                          type="text"
                          required
                          value={newGuestData.first_name}
                          onChange={e => setNewGuestData({...newGuestData, first_name: e.target.value})}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Last Name</label>
                        <input
                          type="text"
                          required
                          value={newGuestData.last_name}
                          onChange={e => setNewGuestData({...newGuestData, last_name: e.target.value})}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Email</label>
                        <input
                          type="email"
                          value={newGuestData.email}
                          onChange={e => setNewGuestData({...newGuestData, email: e.target.value})}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Phone</label>
                        <input
                          type="text"
                          value={newGuestData.phone}
                          onChange={e => setNewGuestData({...newGuestData, phone: e.target.value})}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Household / Party</label>
                        <select
                          value={newGuestData.party_id}
                          onChange={e => {
                            const selectedPartyId = e.target.value;
                            setNewGuestData({
                              ...newGuestData,
                              party_id: selectedPartyId
                            });
                          }}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm appearance-none"
                        >
                          <option value="">No Party (Individual)</option>
                          {parties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">RSVP Status</label>
                        <select
                          value={newGuestData.rsvp_status}
                          onChange={e => setNewGuestData({...newGuestData, rsvp_status: e.target.value})}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="attending">Attending</option>
                          <option value="declined">Declined</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Mailing Address</label>
                      <textarea
                        value={newGuestData.address}
                        onChange={e => setNewGuestData({...newGuestData, address: e.target.value})}
                        className="w-full border border-sage/35 p-3 bg-cream/20 text-xs sm:text-sm outline-none focus:border-sage h-16 resize-none rounded-sm"
                        placeholder="Street Address, City, State, ZIP..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-dashed border-sage/10 pt-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Plus Ones Allowed</label>
                        <input
                          type="number"
                          min="0"
                          max="5"
                          value={newGuestData.plus_ones_allowed}
                          onChange={e => setNewGuestData({...newGuestData, plus_ones_allowed: Number(e.target.value)})}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                        />
                      </div>
                      <div className="flex items-center pt-5">
                        <label className="flex items-center space-x-2 text-xs text-charcoal cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newGuestData.is_plus_one}
                            onChange={e => setNewGuestData({...newGuestData, is_plus_one: e.target.checked})}
                            className="rounded border-sage/35 text-sage focus:ring-sage"
                          />
                          <span className="font-semibold text-[10px] uppercase tracking-widest text-charcoal/50">Is Plus One</span>
                        </label>
                      </div>
                      {newGuestData.is_plus_one && (
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Parent Host Guest</label>
                          <select
                            value={newGuestData.parent_guest_id}
                            onChange={e => setNewGuestData({...newGuestData, parent_guest_id: e.target.value})}
                            className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                          >
                            <option value="">Select Host</option>
                            {guests.filter(g => g.id !== isEditingGuest?.id && !g.is_plus_one).map(g => (
                              <option key={g.id} value={g.id}>{g.first_name} {g.last_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-dashed border-sage/10 pt-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Age Category</label>
                        <select
                          value={newGuestData.age}
                          onChange={e => setNewGuestData({...newGuestData, age: e.target.value})}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                        >
                          <option value="Adult">Adult</option>
                          <option value="Child">Child</option>
                          <option value="Infant">Infant</option>
                        </select>
                      </div>
                      <div className="flex items-center pt-5">
                        <label className="flex items-center space-x-2 text-xs text-charcoal cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newGuestData.needs_highchair}
                            onChange={e => setNewGuestData({...newGuestData, needs_highchair: e.target.checked})}
                            className="rounded border-sage/35 text-sage focus:ring-sage"
                          />
                          <span className="font-semibold text-[10px] uppercase tracking-widest text-charcoal/50">Needs Highchair</span>
                        </label>
                      </div>
                      <div className="flex items-center pt-5">
                        <label className="flex items-center space-x-2 text-xs text-charcoal cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newGuestData.in_wheelchair}
                            onChange={e => setNewGuestData({...newGuestData, in_wheelchair: e.target.checked})}
                            className="rounded border-sage/35 text-sage focus:ring-sage"
                          />
                          <span className="font-semibold text-[10px] uppercase tracking-widest text-charcoal/50">In Wheelchair</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-2 font-semibold">Group Associations (Visibility Restrictions)</label>
                      <div className="space-y-2 border border-sage/20 p-3 bg-cream/10 rounded-sm">
                        {groups.map(group => {
                          const isChecked = newGuestData.selectedGroups.includes(group.id);
                          return (
                            <label key={group.id} className="flex items-center space-x-2 text-xs text-charcoal cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setNewGuestData({
                                      ...newGuestData,
                                      selectedGroups: [...newGuestData.selectedGroups, group.id]
                                    });
                                  } else {
                                    setNewGuestData({
                                      ...newGuestData,
                                      selectedGroups: newGuestData.selectedGroups.filter(id => id !== group.id)
                                    });
                                  }
                                }}
                                className="rounded border-sage/35 text-sage focus:ring-sage"
                              />
                              <span>{group.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Notes</label>
                      <textarea
                        value={newGuestData.notes}
                        onChange={e => setNewGuestData({...newGuestData, notes: e.target.value})}
                        className="w-full border border-sage/35 p-3 bg-cream/20 text-xs sm:text-sm outline-none focus:border-sage h-20 resize-none rounded-sm"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4 border-t border-sage/15">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddGuest(false);
                          setIsEditingGuest(null);
                        }}
                        className="flex-1 py-3 border border-sage/35 text-sage text-xs uppercase tracking-widest rounded-sm hover:bg-sage/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-sage text-white text-xs uppercase tracking-widest hover:bg-sage/95 transition-all rounded-sm font-semibold"
                      >
                        {isEditingGuest ? "Save changes" : "Create Guest"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {/* Guests Table */}
            <div className="bg-white border border-sage/15 overflow-x-auto shadow-sm rounded-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-cream/55 text-charcoal/60 uppercase tracking-wider text-[9px] border-b border-sage/15 select-none">
                    <th className="py-4 px-4 font-semibold text-center w-10">#</th>
                    <th 
                      onClick={() => handleSort("first_name")} 
                      className="py-4 px-6 font-semibold cursor-pointer hover:text-sage transition-colors group whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>First Name</span>
                        {renderSortIcon("first_name")}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("last_name")} 
                      className="py-4 px-6 font-semibold cursor-pointer hover:text-sage transition-colors group whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span>Last Name</span>
                        {renderSortIcon("last_name")}
                      </div>
                    </th>
                    <th className="py-4 px-4 font-semibold whitespace-nowrap w-[150px]">Contact</th>
                    <th className="py-4 px-4 font-semibold whitespace-nowrap w-[150px]">Mailing Address</th>
                    <th 
                      onClick={() => handleSort("party_name")} 
                      className="py-4 px-4 font-semibold cursor-pointer hover:text-sage transition-colors group whitespace-nowrap w-[150px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>Household / Party</span>
                        {renderSortIcon("party_name")}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("group")} 
                      className="py-4 px-4 font-semibold cursor-pointer hover:text-sage transition-colors group whitespace-nowrap w-[150px]"
                    >
                      <div className="flex items-center gap-1">
                        <span>Groups</span>
                        {renderSortIcon("group")}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("plus_ones")} 
                      className="py-4 px-4 font-semibold text-center cursor-pointer hover:text-sage transition-colors group whitespace-nowrap w-[100px]"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>+1 Allowed</span>
                        {renderSortIcon("plus_ones")}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort("rsvp_status")} 
                      className="py-4 px-4 font-semibold text-center cursor-pointer hover:text-sage transition-colors group whitespace-nowrap w-[90px]"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>RSVP Status</span>
                        {renderSortIcon("rsvp_status")}
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/10 text-charcoal/80">
                  {guests.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-charcoal/40 font-serif text-base">
                        No guests added yet. Add your first guest above!
                      </td>
                    </tr>
                  ) : (
                    getSortedGuests().map((g, index) => (
                      <tr key={g.id} className="hover:bg-cream/10 transition-colors">
                        <td className="py-4 px-4 text-center font-sans text-[11px] text-charcoal/35 select-none font-normal">
                          {index + 1}.
                        </td>
                        <td className="py-4 px-6 font-serif text-sm font-medium text-charcoal">
                          <div className="flex items-center gap-1.5">
                            <span>{g.first_name}</span>
                            {g.is_plus_one && (
                              <span className="px-1.5 py-0.5 text-[8px] bg-terracotta/15 text-terracotta rounded-sm uppercase tracking-wider font-sans font-bold">
                                +1
                              </span>
                            )}
                          </div>
                          {g.is_plus_one && g.parent_guest_id && (() => {
                            const parent = guests.find(p => p.id === g.parent_guest_id);
                            return parent ? (
                              <div className="text-[10px] text-charcoal/40 font-sans mt-0.5">
                                Guest of {parent.first_name} {parent.last_name}
                              </div>
                            ) : null;
                          })()}
                        </td>
                        <td className="py-4 px-6 font-serif text-sm font-medium text-charcoal">
                          <span>{g.last_name}</span>
                        </td>
                        <td className="py-4 px-4 leading-relaxed font-sans text-[11px] w-[150px] max-w-[150px] truncate">
                          <div className="truncate" title={g.email || ""}>{g.email || <span className="opacity-40 italic">No email</span>}</div>
                          <div className="opacity-55 mt-0.5 truncate" title={g.phone || ""}>{g.phone || <span className="opacity-40 italic">No phone</span>}</div>
                        </td>
                        <td className="py-4 px-4 font-sans text-[11px] leading-relaxed max-w-[150px] w-[150px] truncate" title={g.address || ""}>
                          {g.address || <span className="opacity-40 italic">No address</span>}
                        </td>
                        <td className="py-4 px-4 font-serif text-[13px] text-olive font-medium w-[150px] max-w-[150px] truncate" title={getPartyName(g.party_id)}>
                          {getPartyName(g.party_id)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const gList = getGuestGroupsList(g.id);
                              if (gList.length === 0) return <span className="text-charcoal/25">-</span>;
                              return gList.map(group => {
                                const gName = group.name.toLowerCase();
                                const colorClass = 
                                  gName === "admin" ? "bg-slate-50 text-slate-600 border-slate-200" :
                                  gName === "bachelor party" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  gName === "bridal party" ? "bg-pink-50 text-pink-700 border-pink-200" :
                                  gName === "estate" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  "bg-sage/10 text-sage border-sage/20";
                                return (
                                  <span key={group.id} className={`px-1.5 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-semibold border ${colorClass}`}>
                                    {group.name}
                                  </span>
                                );
                              });
                            })()}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {g.plus_ones_allowed && g.plus_ones_allowed > 0 ? (
                            <span className="px-2 py-0.5 bg-terracotta/15 text-terracotta rounded-full border border-terracotta/20 font-sans font-bold text-[10px]">
                              +{g.plus_ones_allowed}
                            </span>
                          ) : (
                            <span className="text-charcoal/25">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-semibold ${
                            g.rsvp_status === "attending" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            g.rsvp_status === "declined" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                            "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {g.rsvp_status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditGuestClick(g)}
                              className="inline-flex p-1.5 text-sage hover:bg-sage/10 rounded-sm transition-colors cursor-pointer"
                              title="Edit details"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteGuest(g.id)}
                              className="inline-flex p-1.5 text-rose-500 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                              title="Delete guest"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PARTIES */}
        {activeTab === "parties" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif text-charcoal">Manage Parties & Household Groups</h2>
              <button
                onClick={() => setShowAddParty(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-sage text-white text-xs uppercase tracking-widest hover:bg-sage/90 shadow-sm font-semibold rounded-sm cursor-pointer"
              >
                <Plus size={14} />
                Create Party
              </button>
            </div>

            {showAddParty && (
              <div 
                onClick={() => {
                  setShowAddParty(false);
                  setIsEditingParty(null);
                  setTempPartyMembers([]);
                  setSelectedGuestToAdd("");
                }}
                className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <motion.div
                  onClick={e => e.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-sage/20 p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-md rounded-sm space-y-6"
                >
                  <h3 className="text-2xl font-serif text-charcoal">
                    {isEditingParty ? "Edit Household Details" : "Create New Household"}
                  </h3>
                  
                  <form onSubmit={handleSaveParty} className="space-y-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Household Name</label>
                      <input
                        type="text"
                        required
                        value={newPartyName}
                        onChange={e => setNewPartyName(e.target.value)}
                        placeholder="e.g. Alexis Fortini & Kelsey Hartfelder"
                        className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm font-serif text-base animate-none"
                      />
                    </div>

                    {/* Household Members */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] uppercase tracking-widest text-charcoal/50 font-semibold">Household Members</h4>
                      <div className="border border-sage/20 p-3 bg-cream/10 rounded-sm space-y-2 max-h-[180px] overflow-y-auto">
                        {tempPartyMembers.length === 0 ? (
                          <p className="text-xs italic text-charcoal/40 p-1">No members added to this household yet.</p>
                        ) : (
                          tempPartyMembers.map(m => (
                            <div key={m.id} className="flex items-center justify-between bg-white/50 px-2 py-1.5 border border-sage/10 rounded-sm">
                              <span className="font-serif text-sm">
                                {m.first_name} {m.last_name}
                                {m.is_plus_one && (
                                  <span className="ml-1.5 px-1 py-0.5 text-[7px] bg-terracotta/15 text-terracotta rounded-sm uppercase tracking-wider font-sans font-bold">
                                    +1
                                  </span>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setTempPartyMembers(tempPartyMembers.filter(member => member.id !== m.id));
                                }}
                                className="text-xs text-rose-600 hover:text-rose-800 uppercase tracking-wider font-semibold font-sans px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Add Guest to Household */}
                    <div className="space-y-2 border-t border-dashed border-sage/20 pt-4">
                      <h4 className="text-[10px] uppercase tracking-widest text-charcoal/50 font-semibold">Add Member to Household</h4>
                      <div className="flex gap-2">
                        <select
                          value={selectedGuestToAdd}
                          onChange={e => setSelectedGuestToAdd(e.target.value)}
                          className="flex-1 border border-sage/35 p-2 bg-cream/20 text-xs sm:text-sm outline-none focus:border-sage rounded-sm"
                        >
                          <option value="">Select a guest to add...</option>
                          {guests
                            .filter(g => !tempPartyMembers.some(tm => tm.id === g.id))
                            .map(g => (
                              <option key={g.id} value={g.id}>
                                {g.first_name} {g.last_name} {g.party_id ? `(Current Party: ${parties.find(p => p.id === g.party_id)?.name || ''})` : ''}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedGuestToAdd) return;
                            const guestToAdd = guests.find(g => g.id === selectedGuestToAdd);
                            if (guestToAdd) {
                              setTempPartyMembers([...tempPartyMembers, guestToAdd]);
                              setSelectedGuestToAdd("");
                            }
                          }}
                          className="px-4 py-2 bg-sage text-white text-xs uppercase tracking-widest hover:bg-sage/90 rounded-sm font-semibold transition-all cursor-pointer font-sans"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4 border-t border-sage/15">
                      <button
                        type="button"
                        onClick={() => {
                          setNewPartyName("");
                          setIsEditingParty(null);
                          setTempPartyMembers([]);
                          setSelectedGuestToAdd("");
                          setShowAddParty(false);
                        }}
                        className="flex-1 py-3 border border-sage/35 text-sage text-xs uppercase tracking-widest rounded-sm hover:bg-sage/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-sage text-white text-xs uppercase tracking-widest hover:bg-sage/95 transition-all rounded-sm font-semibold"
                      >
                        {isEditingParty ? "Save Changes" : "Save"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parties.map(party => {
                const members = guests.filter(g => g.party_id === party.id);
                return (
                  <div key={party.id} className="bg-white border border-sage/15 p-5 shadow-sm rounded-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex items-center justify-between border-b border-sage/10 pb-2 mb-3">
                        <h3 className="font-serif text-base font-semibold text-charcoal leading-snug">{party.name}</h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditPartyClick(party)}
                            className="p-1 text-sage hover:text-sage/75 transition-colors cursor-pointer"
                            title="Edit Party"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteParty(party.id)}
                            className="p-1 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                            title="Delete Party"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-3">
                        <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-semibold mb-1">Household Members</p>
                        {members.length === 0 ? (
                          <p className="text-xs italic text-charcoal/40">No guests linked to this party yet.</p>
                        ) : (
                          members.map(m => (
                            <div key={m.id} className="flex items-center justify-between text-xs text-charcoal/80">
                              <span className="flex items-center gap-1 font-serif text-[13px]">
                                {m.first_name} {m.last_name}
                                {m.is_plus_one && (
                                  <span className="px-1 text-[7px] bg-terracotta/15 text-terracotta rounded-sm uppercase tracking-wider font-sans font-bold">
                                    +1
                                  </span>
                                )}
                              </span>
                              <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                                m.rsvp_status === "attending" ? "text-emerald-700 bg-emerald-50" :
                                m.rsvp_status === "declined" ? "text-rose-700 bg-rose-50" :
                                "text-amber-700 bg-amber-50"
                              }`}>{m.rsvp_status}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: EVENTS SCHEDULE */}
        {activeTab === "events" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif text-charcoal">Manage Events</h2>
              <button
                onClick={() => {
                  setIsEditingEvent(null);
                  setNewEventData({
                    title: "",
                    description: "",
                    date: "",
                    start_time: "",
                    end_time: "",
                    location: "",
                    dress_code: "",
                    is_public: true,
                    group_id: ""
                  });
                  setShowAddEvent(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-sage text-white text-xs uppercase tracking-widest hover:bg-sage/90 shadow-sm font-semibold rounded-sm cursor-pointer"
              >
                <Plus size={14} />
                Create Event
              </button>
            </div>

            {/* Event Form Modal */}
            {showAddEvent && (
              <div className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-sage/20 p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-md rounded-sm"
                >
                  <h3 className="text-2xl font-serif mb-6 text-charcoal">
                    {isEditingEvent ? "Edit Event Details" : "Add New Event"}
                  </h3>

                  <form onSubmit={handleSaveEvent} className="space-y-5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Event Title</label>
                      <input
                        type="text"
                        required
                        value={newEventData.title}
                        onChange={e => setNewEventData({...newEventData, title: e.target.value})}
                        className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                        placeholder="e.g. Bridal Party Champagne Brunch"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Date</label>
                        <input
                          type="date"
                          required
                          value={newEventData.date}
                          onChange={e => setNewEventData({...newEventData, date: e.target.value})}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-xs sm:text-sm outline-none focus:border-sage rounded-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Start Time</label>
                        <input
                          type="time"
                          required
                          value={newEventData.start_time}
                          onChange={e => setNewEventData({...newEventData, start_time: e.target.value})}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-xs sm:text-sm outline-none focus:border-sage rounded-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">End Time</label>
                        <input
                          type="time"
                          value={newEventData.end_time}
                          onChange={e => setNewEventData({...newEventData, end_time: e.target.value})}
                          className="w-full border border-sage/35 p-2 bg-cream/20 text-xs sm:text-sm outline-none focus:border-sage rounded-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Location</label>
                      <input
                        type="text"
                        required
                        value={newEventData.location}
                        onChange={e => setNewEventData({...newEventData, location: e.target.value})}
                        className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                        placeholder="The Estate pool lawn, Lavender Bistro..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Dress Code</label>
                      <input
                        type="text"
                        value={newEventData.dress_code}
                        onChange={e => setNewEventData({...newEventData, dress_code: e.target.value})}
                        className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-sage rounded-sm"
                        placeholder="e.g. Pool Casual: Swimwear encouraged"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
                      <label className="flex items-center space-x-2 text-xs text-charcoal cursor-pointer font-semibold uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={newEventData.is_public}
                          onChange={e => setNewEventData({...newEventData, is_public: e.target.checked})}
                          className="rounded border-sage/35 text-sage focus:ring-sage"
                        />
                        <span>Public Event (All Guests)</span>
                      </label>

                      {!newEventData.is_public && (
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1 font-semibold">Visibility Group</label>
                          <select
                            value={newEventData.group_id}
                            onChange={e => setNewEventData({...newEventData, group_id: e.target.value})}
                            className="w-full border border-sage/35 p-2 bg-cream/20 text-xs sm:text-sm outline-none focus:border-sage rounded-sm"
                          >
                            <option value="">Select Target Group</option>
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">Description</label>
                      <textarea
                        value={newEventData.description}
                        onChange={e => setNewEventData({...newEventData, description: e.target.value})}
                        className="w-full border border-sage/35 p-3 bg-cream/20 text-xs sm:text-sm outline-none focus:border-sage h-20 resize-none rounded-sm"
                        placeholder="Describe the activities, timeline..."
                      />
                    </div>

                    <div className="flex space-x-3 pt-4 border-t border-sage/15">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddEvent(false);
                          setIsEditingEvent(null);
                        }}
                        className="flex-1 py-3 border border-sage/35 text-sage text-xs uppercase tracking-widest rounded-sm hover:bg-sage/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-sage text-white text-xs uppercase tracking-widest hover:bg-sage/95 transition-all rounded-sm font-semibold"
                      >
                        {isEditingEvent ? "Save Changes" : "Create Event"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}

            {/* Events List Cards */}
            <div className="space-y-4">
              {events.map(event => {
                const grpName = event.is_public ? "Public Event" : (groups.find(g => g.id === event.group_id)?.name || "Private Event");
                return (
                  <div key={event.id} className="bg-white border border-sage/15 p-6 shadow-sm rounded-sm flex flex-col md:flex-row md:items-start justify-between gap-6 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-serif text-xl text-charcoal leading-tight">{event.title}</h3>
                        <span className={`px-2.5 py-0.5 text-[9px] uppercase tracking-wider rounded-sm font-semibold ${
                          event.is_public 
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                            : "bg-indigo-50 text-indigo-800 border border-indigo-100"
                        }`}>
                          {grpName}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-6 font-sans text-xs text-charcoal/70">
                        <div>
                          <span className="opacity-50">Date:</span> {event.date}
                        </div>
                        <div>
                          <span className="opacity-50">Time:</span> {event.start_time.substring(0,5)} {event.end_time ? `- ${event.end_time.substring(0,5)}` : ""}
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <span className="opacity-50">Location:</span> {event.location}
                        </div>
                      </div>

                      {event.dress_code && (
                        <p className="text-[11px] font-sans italic text-sage bg-sage/5 border border-sage/10 p-2 rounded-sm max-w-xl">
                          <span className="font-semibold not-italic text-[9px] uppercase tracking-wider text-sage mr-1.5">Dress Code:</span>
                          {event.dress_code}
                        </p>
                      )}

                      {event.description && (
                        <p className="text-xs text-charcoal/65 leading-relaxed max-w-3xl font-sans mt-2">{event.description}</p>
                      )}
                    </div>

                    <div className="flex md:flex-col items-center justify-end gap-2 md:self-stretch">
                      <button
                        onClick={() => handleEditEventClick(event)}
                        className="flex items-center gap-1.5 px-3.5 py-2 border border-sage/35 text-sage text-xs uppercase tracking-wider rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-medium"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 text-rose-500 text-xs uppercase tracking-wider rounded-sm hover:bg-rose-500 hover:text-white transition-all cursor-pointer font-medium"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: EXPORT */}
        {activeTab === "export" && (
          <div className="max-w-2xl mx-auto text-center py-12 space-y-8 bg-white border border-sage/15 p-8 md:p-12 shadow-sm rounded-sm">
            <div className="w-16 h-16 rounded-full bg-sage/10 text-sage flex items-center justify-center mx-auto shadow-debossed">
              <Download className="w-8 h-8" />
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-serif text-charcoal">Export Guest List</h2>
              <p className="text-sm text-charcoal/65 max-w-md mx-auto leading-relaxed">
                Download the entire guest list fully formatted for import directly into <strong>Aisle Planner</strong>. The CSV file automatically structures household party IDs, group assignments, meal selections, and dietary restrictions.
              </p>
            </div>

            <div className="border-y border-sage/15 py-4 max-w-sm mx-auto flex items-center justify-between text-xs text-charcoal/70 gap-4">
              <span className="font-semibold uppercase tracking-wider text-[9px] text-charcoal/40">Layout Style</span>
              <select
                value={exportLayout}
                onChange={(e) => setExportLayout(e.target.value as "individual" | "grouped")}
                className="bg-cream border border-sage/35 text-charcoal text-xs px-3 py-1 rounded-sm focus:outline-none focus:ring-1 focus:ring-terracotta focus:border-terracotta cursor-pointer font-semibold"
              >
                <option value="individual">By-Individual Standard (Flat)</option>
                <option value="grouped">By-Party Grouped (Empty Row Separated)</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-8 py-4 bg-terracotta text-cream font-sans text-xs uppercase tracking-[0.25em] shadow-sm hover:bg-olive hover:text-white transition-all duration-300 font-semibold rounded-sm cursor-pointer"
            >
              <Download size={14} />
              Export to Aisle Planner CSV
            </button>
          </div>
        )}

        {/* TAB 5: BACKUPS & RECOVERY */}
        {activeTab === "backups" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-sage/15">
              <h2 className="text-xl font-serif text-charcoal">Backups & Disaster Recovery</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Manual Backup and Import */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white border border-sage/15 p-6 shadow-sm rounded-sm space-y-4">
                  <h3 className="font-serif text-lg text-charcoal border-b border-sage/10 pb-2">Manual Control</h3>
                  <p className="text-xs text-charcoal/65 leading-relaxed font-sans">
                    Keep a copy of your guest list safe on your computer. Download a backup file regularly. If anything is deleted, you can upload it here to restore everything instantly.
                  </p>
                  
                  <div className="pt-4 space-y-3">
                    <button
                      onClick={handleSyncSupabaseToLocal}
                      disabled={isSyncing}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 border border-olive bg-olive text-cream text-xs uppercase tracking-widest rounded-sm hover:bg-sage hover:text-white transition-all font-semibold cursor-pointer ${
                        isSyncing ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Database size={14} className={isSyncing ? "animate-spin" : ""} />
                      {isSyncing ? "Syncing..." : "Sync Supabase to Local Config"}
                    </button>

                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to sync all local config files to Supabase? This will overwrite the live Supabase database and site configurations with your local files.")) {
                          try {
                            await mockDatabase.resetToSeeds();
                            alert("Successfully synchronized local configurations to Supabase! Reloading page...");
                            window.location.reload();
                          } catch (err) {
                            console.error("Failed to sync local config to Supabase:", err);
                            alert("Error syncing local config to Supabase.");
                          }
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-terracotta text-cream text-xs uppercase tracking-widest rounded-sm hover:bg-olive hover:text-white transition-all cursor-pointer font-semibold shadow-sm text-center"
                    >
                      <RotateCcw size={14} />
                      SYNC LOCAL CONFIG TO SUPABASE
                    </button>

                    <button
                      onClick={handleDownloadJSON}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-sage text-sage text-xs uppercase tracking-widest rounded-sm hover:bg-sage/5 transition-all font-semibold cursor-pointer"
                    >
                      <Download size={14} />
                      DOWNLOAD BACKUP FILE
                    </button>
                    
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportJSON}
                        id="backup-upload"
                        className="hidden"
                      />
                      <label
                        htmlFor="backup-upload"
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-rose-300 text-rose-600 text-xs uppercase tracking-widest rounded-sm hover:bg-rose-50 transition-all font-semibold cursor-pointer text-center"
                      >
                        <Upload size={14} />
                        RESTORE FROM FILE
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Automatic Backups History */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-sage/15 p-6 shadow-sm rounded-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-sage/10 pb-2">
                    <h3 className="font-serif text-lg text-charcoal flex items-center gap-2">
                      <History className="w-5 h-5 text-sage" />
                      Automatic Restore Points
                    </h3>
                    <button
                      onClick={handleCreateManualBackup}
                      disabled={isSyncing}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border border-olive bg-olive text-cream uppercase tracking-wider text-[10px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold ${
                        isSyncing ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Plus size={11} />
                      Create Backup
                    </button>
                  </div>
                  <p className="text-xs text-charcoal/65 leading-relaxed font-sans">
                    Every time you modify guests, groups, or RSVPs, we automatically save a restore point. If you make a mistake or delete a guest by accident, you can revert to any previous state in the timeline below.
                  </p>

                  <div className="divide-y divide-sage/10 overflow-y-auto max-h-[450px] pr-2 scrollbar-thin scrollbar-thumb-sage/20 pt-2">
                    {backups.length === 0 ? (
                      <p className="text-xs text-charcoal/40 italic py-8 text-center font-serif">
                        No automatic restore points have been created yet. Backups will appear here as you edit the site data.
                      </p>
                    ) : (
                      backups.map((b) => {
                        const date = new Date(b.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        });
                        return (
                          <div key={b.id} className="py-4 flex items-center justify-between gap-4 text-xs">
                            <div className="space-y-1">
                              <p className="font-semibold text-charcoal leading-snug">{b.action}</p>
                              <p className="text-[10px] text-charcoal/40 font-sans tracking-wide uppercase">{date}</p>
                            </div>
                            <button
                              onClick={() => handleRestoreBackup(b.id, b.action)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-sage/40 text-sage uppercase tracking-wider text-[10px] rounded-sm hover:bg-sage hover:text-white transition-all cursor-pointer font-semibold shrink-0"
                            >
                              <RotateCcw size={11} />
                              Revert
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: WEBSITE SETTINGS */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-sage/15 p-4 rounded-sm shadow-sm">
                <p className="text-[10px] uppercase tracking-widest text-charcoal/40 font-bold mb-3 hidden lg:block">Sections</p>
                <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-none">
                  {[
                    { id: "general", label: "General Settings" },
                    { id: "images", label: "Website Images" },
                    { id: "meals", label: "RSVP Meal Choices" },
                    { id: "story", label: "Our Story Timeline" },
                    { id: "weekend", label: "The Weekend Intro" },
                    { id: "dj_lineup", label: "DJ Music Lineup" },
                    { id: "travel", label: "Travel & Hotels" },
                    { id: "map", label: "Desert Guide Map" },
                    { id: "registry", label: "Registry Funds" },
                    { id: "faq", label: "FAQ & Questions" },
                    { id: "admin", label: "Security & Admins" }
                  ].map(sec => (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSettingsSection(sec.id as any)}
                      className={`whitespace-nowrap lg:whitespace-normal text-left px-4 py-2.5 text-xs font-semibold rounded-sm transition-all shrink-0 ${
                        activeSettingsSection === sec.id
                          ? "bg-sage text-white shadow-sm"
                          : "text-sage hover:bg-sage/5"
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Panel */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-sage/15 p-6 md:p-8 rounded-sm shadow-sm space-y-6">
                {!isConfigLoaded || !tempConfigData ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-charcoal/50 font-sans tracking-wide">Loading configuration from database...</p>
                  </div>
                ) : (
                  <>
                    {/* Workspace Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-sage/15 gap-4">
                      <div>
                        <h2 className="text-2xl font-serif text-charcoal">
                          {activeSettingsSection === "general" && "General Wedding Details"}
                          {activeSettingsSection === "images" && "Website Images & Slots"}
                          {activeSettingsSection === "meals" && "RSVP Meal Choices"}
                          {activeSettingsSection === "story" && "Our Story Timeline"}
                          {activeSettingsSection === "faq" && "FAQ & Q&A List"}
                          {activeSettingsSection === "travel" && "Travel Accommodations & Favorites"}
                          {activeSettingsSection === "registry" && "Gift Registry & Funds"}
                          {activeSettingsSection === "map" && "Desert Guide Map Pins"}
                          {activeSettingsSection === "dj_lineup" && "DJ Music Lineup Schedule"}
                          {activeSettingsSection === "weekend" && "The Weekend Section Introduction"}
                          {activeSettingsSection === "admin" && "Admin Portal Security Settings"}
                        </h2>
                        <p className="text-xs text-charcoal/50 mt-1 font-sans">
                          {activeSettingsSection === "general" && "Set names, wedding date, location, and landing prompts."}
                          {activeSettingsSection === "images" && "Configure background and section images across the website."}
                          {activeSettingsSection === "meals" && "Customize the meal options that guests can select when submitting their RSVPs."}
                          {activeSettingsSection === "story" && "Manage the steps of your story from first meeting to engagement."}
                          {activeSettingsSection === "faq" && "Edit Q&As for guest convenience (dress code, kids, parking, etc.)."}
                          {activeSettingsSection === "travel" && "Provide airport distances, hotel links, and local activities."}
                          {activeSettingsSection === "registry" && "Link your honeymoon or household registries and cash funds."}
                          {activeSettingsSection === "map" && "Place pins on the interactive map for venues, food, golf, and stay."}
                          {activeSettingsSection === "dj_lineup" && "Set the DJ sets schedule for the Welcome Party, Reception, and Afters."}
                          {activeSettingsSection === "weekend" && "Customize the text introducing the main timeline events page."}
                          {activeSettingsSection === "admin" && "Configure the portal access passcode and whitelist admin names."}
                        </p>
                      </div>

                      <button
                        onClick={handleSaveSettingsConfig}
                        disabled={isSavingConfig}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-terracotta text-white font-sans text-xs uppercase tracking-widest hover:bg-olive hover:text-white transition-all duration-300 font-semibold rounded-sm shadow-sm cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={14} className={isSavingConfig ? "animate-spin" : ""} />
                        {isSavingConfig ? "Saving..." : "Save Configuration"}
                      </button>
                    </div>

                    {/* Workspace Form Elements */}
                    <div className="space-y-6">
                      {activeSettingsSection === "general" && renderGeneralSection()}
                      {activeSettingsSection === "images" && renderImagesSection()}
                      {activeSettingsSection === "meals" && renderMealsSection()}
                      {activeSettingsSection === "story" && renderStorySection()}
                      {activeSettingsSection === "weekend" && renderWeekendSection()}
                      {activeSettingsSection === "dj_lineup" && renderDJSection()}
                      {activeSettingsSection === "travel" && renderTravelSection()}
                      {activeSettingsSection === "map" && renderMapSection()}
                      {activeSettingsSection === "registry" && renderRegistrySection()}
                      {activeSettingsSection === "faq" && renderFAQSection()}
                      {activeSettingsSection === "admin" && renderAdminSection()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
