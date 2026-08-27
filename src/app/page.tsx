"use client";

import React, { useState, useEffect } from "react";
import HeroSection from "@/components/Hero";
import TheWeekend from "@/components/TheWeekend";
import RestAndRecharge from "@/components/RestAndRecharge";
import Registry from "@/components/Registry";
import RSVPForm from "@/components/RSVPForm";
import GuestGate from "@/components/GuestGate";
import OurStory from "@/components/OurStory";
import GalleryTeaser from "@/components/GalleryTeaser";
import FAQ from "@/components/FAQ";
import DJLineup from "@/components/DJLineup";
import NavigationTabs from "@/components/NavigationTabs";
import { mockDatabase } from "@/lib/mockDatabase";
import adminConfigDefault from "@config/ui/admin.json";
import Link from "next/link";
import { Lock } from "lucide-react";

export default function Home() {
  const [guest, setGuest] = useState<any>(null);
  const [config, setConfig] = useState(adminConfigDefault);

  useEffect(() => {
    mockDatabase.getSiteConfig("admin", adminConfigDefault).then(setConfig);
  }, []);

  // Disable browser automatic scroll restoration and force top scroll on mount & guest grant
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname);
      }
    };

    resetScroll();
    const t1 = setTimeout(resetScroll, 50);
    const t2 = setTimeout(resetScroll, 150);
    const t3 = setTimeout(resetScroll, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [guest]);

  if (!guest) {
    return <GuestGate onAccessGranted={setGuest} />;
  }

  const isAdmin = guest && config.admins.some(
    (a: any) => a.first === guest.first_name.toLowerCase().trim() &&
                a.last === guest.last_name.toLowerCase().trim()
  );

  return (
    <main className="w-full relative selection:bg-sage/20 selection:text-sage bg-cream">
      <NavigationTabs />
      <HeroSection />
      <OurStory />
      <GalleryTeaser />
      <TheWeekend guest={guest} />
      <DJLineup />
      <RestAndRecharge />
      <Registry />
      <FAQ />
      <RSVPForm guest={guest} />

      {isAdmin && (
        <div className="fixed bottom-6 left-6 z-[90]">
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-3 bg-charcoal/85 hover:bg-terracotta backdrop-blur-md border border-cream/10 text-cream rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer text-xs font-sans font-semibold uppercase tracking-wider"
          >
            <Lock size={12} className="text-terracotta group-hover:text-cream transition-colors" />
            <span>Admin Portal</span>
          </Link>
        </div>
      )}
    </main>
  );
}
