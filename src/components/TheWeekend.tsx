"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { mockDatabase } from "@/lib/mockDatabase";
import { getResponsiveImageStyle } from "@/lib/imageHelper";
import weekendConfigDefault from "@config/ui/weekend.json";
import imagesConfigDefault from "@config/ui/images.json";

const SoupIcon = ({ className }: { className?: string }) => (
  <svg
    className={`w-8 h-8 ${className || ""}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" />
    <path d="M7 21h10" />
    <path d="M19.5 12 22 6" />
    <path d="M16 12l.5-5" />
    <path d="M12 12V4" />
    <path d="M8 12l-.5-5" />
    <path d="M4.5 12 2 6" />
  </svg>
);

const EventCard = ({ event, index, total }: { event: any; index: number; total: number }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showTooltip]);

  // Helper to format date strings from DB, safe fallback
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "TBD";
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return "TBD";
    }
  };

  // Helper to format time strings (HH:mm:ss), safe fallback
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "TBD";
    try {
      const [hours, minutes] = timeStr.split(":");
      const h = parseInt(hours);
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 || 12;
      return `${displayH}:${minutes} ${ampm}`;
    } catch {
      return "TBD";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      viewport={{ once: true, margin: "-100px" }}
      className="relative pl-10 md:pl-0"
    >
      <div className="md:grid md:grid-cols-5 md:gap-8 items-start">
        {/* Left Side (Time/Date for Desktop) */}
        <div className="hidden md:block col-span-2 text-right pt-1">
          <p className="font-serif text-olive text-2xl tracking-wide">
            {event.date ? new Date(event.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" }) : "TBD"}
          </p>
          <p className="font-sans text-[10px] tracking-[0.2em] text-charcoal/50 uppercase mt-1.5">
            {formatDate(event.date)}
          </p>
          <p className="font-sans text-xs tracking-widest text-terracotta uppercase mt-2.5 font-medium">
            {formatTime(event.start_time)} - {formatTime(event.end_time)}
          </p>
        </div>

        {/* Center Timeline Node */}
        <div className="absolute left-0 top-2.5 md:relative md:top-2 md:col-span-1 flex justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-terracotta border border-cream ring-4 ring-terracotta/25 z-10 shadow-sm transition-transform hover:scale-125"></div>
          {index !== total - 1 && (
            <div className="absolute top-5 left-[4.5px] md:left-1/2 md:-ml-[0.5px] w-[1px] h-full bg-olive/20"></div>
          )}
        </div>

        {/* Right Side (Content) */}
        <div className="col-span-2 pb-10 md:pb-14">
          <div className="md:hidden mb-3">
            <p className="font-serif text-olive text-xl">
              {event.date ? new Date(event.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" }) : "TBD"}
            </p>
            <p className="font-sans text-[10px] tracking-[0.15em] text-charcoal/50 uppercase">
              {formatDate(event.date)} | {formatTime(event.start_time)}
            </p>
          </div>
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-2xl font-serif text-charcoal tracking-wide leading-tight">{event.title}</h3>
            {event.title.toLowerCase().includes("soup") && (
              <span className="text-terracotta opacity-80"><SoupIcon /></span>
            )}
          </div>
          <p className="font-sans text-sm text-charcoal/70 tracking-wide mb-4 flex items-center gap-1.5">
            <MapPin size={14} className="text-olive/70 inline" />
            {event.location}
          </p>
          
          {event.dress_code && (
            event.dress_code.includes(":") ? (
              <div className="relative inline-block" ref={tooltipRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(!showTooltip);
                  }}
                  className="font-sans text-[10px] uppercase tracking-[0.2em] text-olive border-b border-olive/35 pb-1 hover:text-terracotta hover:border-terracotta transition-colors outline-none cursor-pointer"
                >
                  Dress Code: {event.dress_code.split(":")[0]}
                </button>

                <AnimatePresence>
                  {showTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 md:left-0 top-full mt-2 w-64 p-4 bg-cream border border-olive/20 shadow-md z-20 text-xs font-sans text-charcoal/80 leading-relaxed rounded-sm"
                    >
                      {event.dress_code.split(":")[1].trim()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-olive pb-1">
                Dress Code: {event.dress_code}
              </span>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function TheWeekend({ guest }: { guest: any }) {
  const [config, setConfig] = useState(weekendConfigDefault);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);

  useEffect(() => {
    mockDatabase.getSiteConfig("weekend", weekendConfigDefault).then(setConfig);
    mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        if (!guest || guest.id === "mock-guest-id") {
          throw new Error("Using mock guest");
        }

        // 1. Fetch public events
        const { data: publicEvents, error: pubErr } = await supabase
          .from("events")
          .select("*")
          .eq("is_public", true);

        if (pubErr) throw pubErr;

        // 2. Fetch guest's groups
        const { data: groupsData, error: grpErr } = await supabase
          .from("guest_groups")
          .select("group_id")
          .eq("guest_id", guest.id);

        if (grpErr) throw grpErr;
        const groupIds = groupsData?.map((g: any) => g.group_id) || [];

        // 3. Fetch private events for those groups
        let groupEvents: any[] = [];
        if (groupIds.length > 0) {
          const { data: matchedEvents, error: matchedErr } = await supabase
            .from("events")
            .select("*")
            .in("group_id", groupIds);
          if (matchedErr) throw matchedErr;
          if (matchedEvents) groupEvents = matchedEvents;
        }

        // Combine and remove duplicates
        const combined = [...(publicEvents || []), ...groupEvents];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        // Sort by date/time
        const sorted = unique.sort((a, b) => {
          if (!a.date || !a.start_time) return 1;
          if (!b.date || !b.start_time) return -1;
          return new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime();
        });

        setEvents(sorted);
      } catch (err) {
        console.warn("Falling back to local mockDatabase for events:", err);
        // Fallback to local mockDatabase
        try {
          const localEvents = await mockDatabase.getEvents();
          
          // Find groups this guest belongs to
          const guestId = guest?.id || "a1b2c3d4-5678-90ab-cdef-0123456789ab"; // default to Alexis if mock-guest-id
          const localGG = await mockDatabase.getGuestGroups();
          const myGuestGroups = localGG
            .filter(gg => gg.guest_id === guestId)
            .map(gg => gg.group_id);

          const visibleEvents = localEvents.filter(e => 
            e.is_public || (e.group_id && myGuestGroups.includes(e.group_id))
          );

          // Sort by date/time
          const sorted = visibleEvents.sort((a, b) => {
            if (!a.date || !a.start_time) return 1;
            if (!b.date || !b.start_time) return -1;
            return new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime();
          });

          setEvents(sorted);
        } catch (innerErr) {
          console.error("Failed to load events from backup database:", innerErr);
        }
      } finally {
        setLoading(false);
      }
    };

    if (guest) {
      fetchEvents();
    }
  }, [guest]);

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-cream text-center">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin mx-auto"></div>
      </section>
    );
  }

  return (
    <section id="weekend" className="relative py-16 md:py-24 px-6 overflow-hidden border-t border-olive/10" style={{ clipPath: "inset(0px)" }}>
      <div 
        className="responsive-bg-image fixed inset-0 bg-cover pointer-events-none bg-center"
        style={getResponsiveImageStyle(imagesConfig, "weekend", "/photos/engagement/K%26A%20Engagement%20highlights-7.jpg")}
      />
      <div className="absolute inset-0 bg-cream/95 pointer-events-none backdrop-blur-[2px]"></div>
      <div className="relative max-w-4xl mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-terracotta block mb-3 font-medium">Itinerary</span>
          <h2 className="text-4xl md:text-5xl font-serif text-charcoal mb-4">
            {config.title}
          </h2>
          <p className="text-olive font-serif italic text-base max-w-md mx-auto">
            {config.description}
          </p>
        </motion.div>

        {events.length === 0 && !loading ? (
          <div className="text-center py-16 border border-olive/15 bg-cream rounded-sm">
            <p className="font-serif text-xl text-charcoal mb-2">Details Coming Soon</p>
            <p className="font-sans text-xs uppercase tracking-widest text-charcoal/50">Check back as we draw closer to the date.</p>
          </div>
        ) : (
          <div className="relative mt-12">
            {events.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} total={events.length} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
