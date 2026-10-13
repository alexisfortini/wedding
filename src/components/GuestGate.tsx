"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { lookupGuest } from "@/lib/guestLookup";
import { mockDatabase } from "@/lib/mockDatabase";
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
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    mockDatabase.getSiteConfig("general", generalConfigDefault).then(setConfig);
  }, []);

  const grantAccess = (guestData: any) => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname);
    }
    onAccessGranted(guestData);
  };

  const rememberGuest = (guest: any) => {
    try {
      localStorage.setItem("wedding_guest", JSON.stringify({ id: guest.id, first_name: guest.first_name, last_name: guest.last_name }));
    } catch { /* A blocked browser storage setting must not prevent sign-in. */ }
  };

  // The saved identifier only helps find the invitation; current details always come from Supabase.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const restore = async () => {
      try {
        const saved = JSON.parse(localStorage.getItem("wedding_guest") || "null");
        if (!saved?.id) return;
        setFirstName(typeof saved.first_name === "string" ? saved.first_name : "");
        setLastName(typeof saved.last_name === "string" ? saved.last_name : "");
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id)) {
          localStorage.removeItem("wedding_guest");
          return;
        }
        const data = await lookupGuest({ id: saved.id }, controller.signal);
        if (cancelled) return;
        if (data) { rememberGuest(data); grantAccess(data); }
        else localStorage.removeItem("wedding_guest");
      } catch (error) {
        if (!cancelled && !(error instanceof SyntaxError)) setError("We couldn't reopen your invitation. Your name is filled in below so you can retry.");
      }
      finally { if (!cancelled) setRestoring(false); }
    };
    restore();
    return () => { cancelled = true; controller.abort(); };
  }, [onAccessGranted]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !firstName.trim() || !lastName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const guest = await mockDatabase.findGuestByName(firstName, lastName);
      if (!guest) {
        setError(`Unable to find an invitation for ${firstName.trim()} ${lastName.trim()}. Please check spelling or contact the hosts.`);
        return;
      }
      rememberGuest(guest);
      grantAccess(guest);
    } catch (error) {
      setError(error instanceof Error ? error.message : "The guest list is temporarily unavailable. Please try again.");
    } finally { setLoading(false); }
  };

  if (restoring) return <div className="fixed inset-0 z-[100] bg-cream flex items-center justify-center" role="status">Opening your invitation…</div>;

  return (
    <div className="fixed inset-0 z-[100] bg-cream flex overflow-y-auto items-start justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full my-auto bg-surface border border-line p-6 sm:p-10 md:p-12 shadow-card text-center"
      >
        <h1 className="text-4xl font-serif text-charcoal mb-2 text-balance">{config.partner1} & {config.partner2}</h1>
        <p className="font-sans text-label uppercase tracking-label text-muted mb-10">{config.date} • {config.location_name}</p>
        
        <div className="w-12 h-[1px] bg-sage/30 mx-auto mb-10"></div>
        
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="text-left">
            <label htmlFor="guest-first-name" className="block font-sans text-label uppercase tracking-label text-muted mb-2 font-medium">First Name</label>
            <input
              type="text"
              id="guest-first-name"
              autoComplete="given-name"
              required
              maxLength={100}
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setError(""); }}
              className="w-full border-b border-line bg-transparent py-3 outline-none font-serif text-xl focus:border-action transition-colors text-charcoal"
              placeholder="Your first name"
              disabled={loading}
            />
          </div>
          <div className="text-left">
            <label htmlFor="guest-last-name" className="block font-sans text-label uppercase tracking-label text-muted mb-2 font-medium">Last Name</label>
            <input
              type="text"
              id="guest-last-name"
              autoComplete="family-name"
              required
              maxLength={100}
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); setError(""); }}
              className="w-full border-b border-line bg-transparent py-3 outline-none font-serif text-xl focus:border-action transition-colors text-charcoal"
              placeholder="Your last name"
              disabled={loading}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-danger font-sans tracking-normal leading-relaxed"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || !firstName.trim() || !lastName.trim()}
            className="w-full py-5 bg-action text-cream font-sans text-label uppercase tracking-label shadow-card hover:bg-action-hover disabled:opacity-50 transition-all"
          >
            {loading ? "Searching..." : "Access Wedding Website"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
