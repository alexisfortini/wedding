"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Gift } from "lucide-react";
import { mockDatabase } from "@/lib/mockDatabase";
import BackgroundPhoto from "./BackgroundPhoto";
import registryConfigDefault from "@config/ui/registry.json";
import imagesConfigDefault from "@config/ui/images.json";

import AnimatedCounter from "@/components/AnimatedCounter";
import { giftStatus } from "@/lib/registry";

export default function Registry() {
  const [config, setConfig] = useState<any>(registryConfigDefault);
  const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);
  const [fundStatus, setFundStatus] = useState<string | null>("Loading gift total…");
  const [totalRaised, setTotalRaised] = useState<number>(0);
  const [targetAmount, setTargetAmount] = useState<number>(5000);
  const [registryLoaded, setRegistryLoaded] = useState(false);

  const loadContributions = useCallback(() => {
    mockDatabase.getFundContributions().then((res) => {
      setTotalRaised(res.totalRaised || 0);
      setTargetAmount(res.targetAmount);
      setFundStatus(null);
    }).catch(() => setFundStatus("Gift total is temporarily unavailable."));
  }, []);

  useEffect(() => {
    fetch("/api/registry", { cache: "no-store", signal: AbortSignal.timeout(15000) })
      .then(async response => {
        if (!response.ok) throw new Error("Registry unavailable");
        const data = await response.json();
        if (!data.success) throw new Error("Registry unavailable");
        setConfig(data.value); setRegistryLoaded(true);
      }).catch(() => setRegistryLoaded(false));
    mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
    loadContributions();
  }, [loadContributions]);

  const cashFund = config.cash_fund || config.honeymoon_fund || (registryConfigDefault as any).cash_fund || {};
  const isCashFundEnabled = cashFund && cashFund.enabled !== false;

  const rawItems = config.items || (registryConfigDefault as any).items || [];
  const itemsList = useMemo(() => {
    return rawItems.filter((item: any) => item.enabled !== false);
  }, [rawItems]);

  const rawStores = config.stores || (registryConfigDefault as any).stores || [];
  const storesList = useMemo(() => {
    return rawStores.filter((store: any) => store.enabled !== false);
  }, [rawStores]);

  const isStoreSectionEnabled = itemsList.length > 0 || storesList.length > 0;

  const mainCards = config.main_cards || (registryConfigDefault as any).main_cards || {};
  const fundCard = mainCards.cash_fund || mainCards.honeymoon || {
    title: "Honeymoon Fund",
    description: "Contribute directly toward our honeymoon adventures via Venmo or Zelle.",
    button_text: "Contribute via Venmo or Zelle"
  };
  const storeCard = mainCards.store || {
    title: "Gift Registry",
    description: "Browse curated items for our home and partner store registries.",
    button_text: "View Registry Items"
  };

  const purchasedItemsCount = useMemo(() => {
    return itemsList.filter((item: any) => ["purchased", "reported"].includes(giftStatus(item))).length;
  }, [itemsList]);
  const totalItemsCount = itemsList.length;
  const purchasedPercentage = totalItemsCount > 0 ? Math.round((purchasedItemsCount / totalItemsCount) * 100) : 0;

  return (
    <section 
      id="registry" 
      className="relative py-16 md:py-24 px-6 overflow-hidden"
      style={{ clipPath: "inset(0px)" }}
    >
      {/* Background Image & Overlay */}
      <BackgroundPhoto config={imagesConfig} slot="registry" fallback="/photos/engagement/K%26A%20Engagement%20highlights-6.jpg" />
      <div className="absolute inset-0 bg-charcoal/60 pointer-events-none"></div>

      {/* Main Section Content */}
      <div className="relative max-w-5xl mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-12"
        >
          <span className="font-sans text-label uppercase tracking-label text-cream/90 block mb-3 font-medium">Registry & Gifts</span>
          <h2 className="text-4xl md:text-5xl font-serif text-cream mb-4 text-balance">
            {config.title || "Registry"}
          </h2>
          <p className="text-cream/90 font-serif italic text-lg max-w-md mx-auto leading-relaxed">
            {config.description}
          </p>
        </motion.div>

        {/* Content: Coming Soon card OR Homepage Choice Cards */}
        {config.hide_registry ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto p-6 sm:p-10 md:p-12 border border-cream/20 bg-charcoal/40 rounded-sm text-center relative overflow-hidden"
          >
            <div className="h-10 mx-auto flex items-center justify-center text-cream/80 mb-6">
              <Gift size={24} strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h3 className="text-2xl md:text-3xl font-serif text-cream mb-3 tracking-normal text-balance">
              {config.coming_soon_title || "Registry Coming Soon"}
            </h3>
            <p className="font-serif italic text-cream/80 text-lg max-w-md mx-auto leading-relaxed">
              {config.coming_soon_message || "We are currently finalizing our registry items & cash fund options. Please check back soon!"}
            </p>
          </motion.div>
        ) : (
          <div className={`grid gap-6 lg:gap-8 items-stretch ${isCashFundEnabled && isStoreSectionEnabled ? "max-w-md mx-auto md:max-w-none md:grid-cols-2" : "max-w-md mx-auto grid-cols-1"}`}>
            {/* Card 1: Honeymoon Fund */}
            {isCashFundEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true }}
                className="h-full min-w-0 p-5 sm:p-6 lg:p-8 border border-cream/20 bg-charcoal/40 rounded-sm text-center relative overflow-hidden flex flex-col justify-between"
              >
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="h-10 mx-auto flex items-center justify-center text-cream/80 mb-6">
                    <Heart size={24} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <span className="font-sans text-label uppercase tracking-label text-cream/90 font-semibold block mb-1">
                    {cashFund.tag || "Honeymoon Fund"}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-serif text-cream mb-2 tracking-normal text-balance">
                    {fundCard.title || cashFund.title || "Honeymoon Fund"}
                  </h3>
                  <p className="font-sans text-copy text-cream/80 tracking-normal mb-6 leading-relaxed max-w-sm mx-auto min-h-[2.75rem] flex items-center justify-center">
                    {fundCard.description || cashFund.description || "Contribute toward our getaway and the memories we’ll make together."}
                  </p>

                  {/* Prominent Live Running Total Display */}
                  <div className="mt-auto mb-6 pt-5 border-t border-cream/20 w-full max-w-xs mx-auto">
                    <div className="flex items-center justify-center gap-1.5 mb-2 text-label uppercase tracking-label text-cream/90 font-semibold">
                      <span>Fund Total</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-serif text-cream font-medium h-10 flex items-baseline justify-center leading-none">
                      {fundStatus ? "—" : <>$<AnimatedCounter value={totalRaised} /></>}
                    </div>
                    <div className="text-label uppercase tracking-label text-cream/90 mt-1.5">
                      {fundStatus || "Contributed So Far"}
                    </div>

                    <div hidden={!!fundStatus} className="mt-5">
                      <div className="flex justify-between text-label text-cream/90 mb-1.5">
                        <span>Progress</span>
                        <span>
                          {targetAmount > 0
                            ? `${Math.min(Math.round((totalRaised / targetAmount) * 100), 100)}% of $${targetAmount.toLocaleString()} Goal`
                            : `$${totalRaised.toLocaleString()} Raised`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-cream/20 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${targetAmount > 0 ? Math.min((totalRaised / targetAmount) * 100, 100) : 100}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className="h-full bg-terracotta rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/registry/fund"
                    className="w-full min-h-12 py-3 font-sans text-label uppercase tracking-label bg-action text-cream px-4 rounded-sm hover:bg-action-hover transition-colors font-medium shadow-card cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{fundCard.button_text || "Contribute to Honeymoon Fund"}</span>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Card 2: Gift Registry */}
            {isStoreSectionEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="h-full min-w-0 p-5 sm:p-6 lg:p-8 border border-cream/20 bg-charcoal/40 rounded-sm text-center relative overflow-hidden flex flex-col justify-between"
              >
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="h-10 mx-auto flex items-center justify-center text-cream/80 mb-6">
                    <Gift size={24} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <span className="font-sans text-label uppercase tracking-label text-cream/90 font-semibold block mb-1">
                    Curated Wishlist
                  </span>
                  <h3 className="text-2xl md:text-3xl font-serif text-cream mb-2 tracking-normal text-balance">
                    {storeCard.title || "Gift Registry"}
                  </h3>
                  <p className="font-sans text-copy text-cream/80 tracking-normal mb-6 leading-relaxed max-w-sm mx-auto min-h-[2.75rem] flex items-center justify-center">
                    {storeCard.description}
                  </p>

                  {/* Prominent Live Items Counter Display */}
                  {registryLoaded ? <div className="mt-auto mb-6 pt-5 border-t border-cream/20 w-full max-w-xs mx-auto">
                    <div className="flex items-center justify-center gap-1.5 mb-2 text-label uppercase tracking-label text-cream/90 font-semibold">
                      <span>Wishlist Status</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-serif text-cream font-medium h-10 flex items-baseline justify-center gap-1.5 leading-none">
                      <AnimatedCounter value={purchasedItemsCount} />
                      <span className="text-xl md:text-2xl text-cream/90 font-normal">of {totalItemsCount}</span>
                    </div>
                    <div className="text-label uppercase tracking-label text-cream/90 mt-1.5">
                      Gifts Claimed So Far
                    </div>

                    <div className="mt-5">
                      <div className="flex justify-between text-label text-cream/90 mb-1.5">
                        <span>Progress</span>
                        <span>{purchasedPercentage}% of Wishlist Claimed</span>
                      </div>
                      <div className="w-full h-1.5 bg-cream/20 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${purchasedPercentage}%` }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                          className="h-full bg-terracotta rounded-full"
                        />
                      </div>
                    </div>
                  </div> : <p className="text-cream/80 my-5">Check the gift list or store registries for current availability.</p>}
                </div>

                <div className="pt-2">
                  <Link
                    href="/registry/items"
                    className="w-full min-h-12 py-3 font-sans text-label uppercase tracking-label bg-action text-cream px-4 rounded-sm hover:bg-action-hover transition-colors font-medium shadow-card cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{storeCard.button_text || "View Registry Items"}</span>
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
