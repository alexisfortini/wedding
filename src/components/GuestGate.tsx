"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { mockDatabase, Guest } from "@/lib/mockDatabase";
import generalConfigDefault from "@config/ui/general.json";

interface GuestGateProps {
  onAccessGranted: (guest: any) => void;
}

export default function GuestGate({ onAccessGranted }: GuestGateProps) {
  const [config, setConfig] = useState(generalConfigDefault);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mockDatabase.getSiteConfig("general", generalConfigDefault).then(setConfig);
  }, []);

  // Check if guest is already in session (LocalStorage for now, can move to cookie/middleware later)
  useEffect(() => {
    const savedGuestStr = localStorage.getItem("wedding_guest");
    if (savedGuestStr) {
      try {
        const savedGuest = JSON.parse(savedGuestStr);
        // Instantly grant access using cached data to avoid flash/delay
        onAccessGranted(savedGuest);

        if (savedGuest && savedGuest.id && savedGuest.id !== "mock-guest-id") {
          // Re-fetch in the background to update with freshest details (like updated party_id)
          supabase
            .from("guests")
            .select(`
              *,
              parties (
                name
              )
            `)
            .eq("id", savedGuest.id)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                localStorage.setItem("wedding_guest", JSON.stringify(data));
                onAccessGranted(data);
              }
            });
        }
      } catch (e) {
        console.error("Error reading or refreshing saved guest:", e);
      }
    }
  }, [onAccessGranted]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) return;

    setLoading(true);
    setError("");

    try {
      // Query guests table (case-insensitive)
      const { data, error: fbError } = await supabase
        .from("guests")
        .select(`
          *,
          parties (
            name
          )
        `)
        .ilike("first_name", firstName.trim())
        .ilike("last_name", lastName.trim())
        .single();

      if (fbError || !data) {
        throw new Error("Invitation not found in Supabase");
      }

      localStorage.setItem("wedding_guest", JSON.stringify(data));
      onAccessGranted(data);
    } catch (err) {
      console.warn("Supabase lookup failed or bypassed. Querying local mockDatabase:", err);
      
      try {
        const localGuest = await mockDatabase.findGuestByName(firstName, lastName);
        if (localGuest) {
          localStorage.setItem("wedding_guest", JSON.stringify(localGuest));
          onAccessGranted(localGuest);
        } else {
          // Create new guest in mockDatabase if not found, to allow seamless test logins
          const newGuestId = typeof crypto !== "undefined" && crypto.randomUUID 
            ? crypto.randomUUID() 
            : `mock-${Date.now()}`;
          
          const newGuest = {
            id: newGuestId,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: "",
            phone: "",
            party_id: null,
            rsvp_status: "pending",
            notes: "",
            is_plus_one: false,
            parent_guest_id: null,
            plus_ones_allowed: 0,
            age: "Adult",
            needs_highchair: false,
            in_wheelchair: false
          };
          await mockDatabase.saveGuest(newGuest as Guest);
          
          const saved = await mockDatabase.findGuestByName(firstName, lastName) || {
            ...newGuest,
            parties: null
          };
          localStorage.setItem("wedding_guest", JSON.stringify(saved));
          onAccessGranted(saved);
        }
      } catch (innerErr) {
        console.error("Database access failed:", innerErr);
        setError("Unable to find invitation. Please check spelling or contact the hosts.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-cream flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-sage/20 p-10 md:p-12 shadow-sm text-center"
      >
        <h1 className="text-4xl font-serif text-sage mb-2">{config.partner1} & {config.partner2}</h1>
        <p className="font-sans text-xs uppercase tracking-[0.3em] text-charcoal/60 mb-10">{config.date} • {config.location_name}</p>
        
        <div className="w-12 h-[1px] bg-sage/30 mx-auto mb-10"></div>
        
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="text-left">
            <label className="block font-sans text-[10px] uppercase tracking-widest text-charcoal/50 mb-2 font-medium">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border-b border-sage/40 bg-transparent py-3 outline-none font-serif text-xl focus:border-sage transition-colors text-charcoal"
              placeholder="Your first name"
              disabled={loading}
            />
          </div>
          <div className="text-left">
            <label className="block font-sans text-[10px] uppercase tracking-widest text-charcoal/50 mb-2 font-medium">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border-b border-sage/40 bg-transparent py-3 outline-none font-serif text-xl focus:border-sage transition-colors text-charcoal"
              placeholder="Your last name"
              disabled={loading}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-red-500 font-sans tracking-wide leading-relaxed"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || !firstName || !lastName}
            className="w-full py-5 bg-sage text-white font-sans text-xs uppercase tracking-[0.25em] shadow-debossed hover:bg-sage/90 disabled:opacity-50 transition-all"
          >
            {loading ? "Searching..." : "Access Wedding Website"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
