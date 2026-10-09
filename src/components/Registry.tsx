"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Gift, ShoppingBag, Sparkles } from "lucide-react";
import { mockDatabase } from "@/lib/mockDatabase";
import { getResponsiveImageStyle } from "@/lib/imageHelper";
import registryConfigDefault from "@config/ui/registry.json";
import imagesConfigDefault from "@config/ui/images.json";

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const duration = 1200;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (value - startValue) * easeOut);
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(step);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

export default function Registry() {
  const [config, setConfig] = useState<any>(registryConfigDefault);
  const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);
  const [totalRaised, setTotalRaised] = useState<number>(0);
  const [targetAmount, setTargetAmount] = useState<number>(5000);

  const loadContributions = useCallback(() => {
    mockDatabase.getFundContributions().then((res) => {
      setTotalRaised(res.totalRaised || 0);
      if (res.targetAmount) setTargetAmount(res.targetAmount);
    });
  }, []);

  useEffect(() => {
    mockDatabase.getSiteConfig("registry", registryConfigDefault).then(setConfig);
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
    return itemsList.filter((item: any) => Boolean(item.is_purchased)).length;
  }, [itemsList]);
  const totalItemsCount = itemsList.length;
  const purchasedPercentage = totalItemsCount > 0 ? Math.round((purchasedItemsCount / totalItemsCount) * 100) : 0;

  return (
    <section 
      id="registry" 
      className="relative py-28 px-6 overflow-hidden"
      style={{ clipPath: "inset(0px)" }}
    >
      {/* Background Image & Overlay */}
      <div 
        className="responsive-bg-image fixed inset-0 bg-cover pointer-events-none bg-center"
        style={getResponsiveImageStyle(imagesConfig, "registry", "/photos/engagement/K%26A%20Engagement%20highlights-6.jpg")}
      />
      <div className="absolute inset-0 bg-charcoal/60 pointer-events-none"></div>

      {/* Main Section Content */}
      <div className="relative max-w-4xl mx-auto z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-terracotta block mb-3 font-medium">Registry & Gifts</span>
          <h2 className="text-4xl md:text-5xl font-serif text-cream mb-4">
            {config.title || "Registry"}
          </h2>
          <p className="text-cream/90 font-serif italic text-base max-w-md mx-auto leading-relaxed">
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
            className="max-w-xl mx-auto p-10 md:p-12 border border-cream/20 bg-charcoal/40 backdrop-blur-md rounded-sm text-center relative overflow-hidden"
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-cream/10 border border-cream/20 flex items-center justify-center text-terracotta mb-6">
              <Gift size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl md:text-3xl font-serif text-cream mb-3 tracking-wide">
              {config.coming_soon_title || "Registry Coming Soon"}
            </h3>
            <p className="font-serif italic text-cream/80 text-base max-w-md mx-auto leading-relaxed">
              {config.coming_soon_message || "We are currently finalizing our registry items & cash fund options. Please check back soon!"}
            </p>
          </motion.div>
        ) : (
          <div className={`grid gap-8 ${isCashFundEnabled && isStoreSectionEnabled ? "md:grid-cols-2" : "max-w-md mx-auto grid-cols-1"}`}>
            {/* Card 1: Honeymoon Fund */}
            {isCashFundEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true }}
                className="p-8 md:p-10 border border-cream/20 bg-charcoal/40 backdrop-blur-md rounded-sm text-center relative overflow-hidden group hover:border-terracotta/50 transition-all duration-500 flex flex-col justify-between"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 mx-auto rounded-full bg-cream/10 border border-cream/20 flex items-center justify-center text-terracotta mb-6 group-hover:scale-105 transition-transform duration-300">
                    <Heart size={24} strokeWidth={1.5} className="fill-current text-terracotta/40" />
                  </div>
                  <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-terracotta font-semibold block mb-1">
                    {cashFund.tag || "Honeymoon Fund"}
                  </span>
                  <h3 className="text-2xl md:text-3xl font-serif text-cream mb-2 tracking-wide">
                    {fundCard.title || cashFund.title || "Honeymoon Fund"}
                  </h3>
                  <p className="font-sans text-xs md:text-sm text-cream/80 tracking-wide mb-6 leading-relaxed max-w-sm mx-auto">
                    {fundCard.description || cashFund.description || "Contribute toward our getaway and the memories we’ll make together."}
                  </p>

                  {/* Prominent Live Running Total Display */}
                  <div className="my-5 p-4 rounded-sm bg-cream/10 border border-cream/15 backdrop-blur-xs max-w-xs mx-auto">
                    <div className="flex items-center justify-center gap-1.5 mb-1.5 text-[9px] uppercase tracking-widest text-emerald-300 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Live Fund Counter</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-serif text-cream font-medium">
                      $<AnimatedCounter value={totalRaised} />
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-cream/60 mt-1">
                      Contributed So Far
                    </div>

                    {targetAmount > 0 && (
                      <div className="mt-3 pt-3 border-t border-cream/10">
                        <div className="flex justify-between text-[10px] text-cream/70 mb-1">
                          <span>Progress</span>
                          <span>{Math.min(Math.round((totalRaised / targetAmount) * 100), 100)}% of ${targetAmount.toLocaleString()} Goal</span>
                        </div>
                        <div className="w-full h-1.5 bg-cream/20 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((totalRaised / targetAmount) * 100, 100)}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="h-full bg-terracotta rounded-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/registry/fund"
                    className="w-full font-sans text-[10px] uppercase tracking-[0.2em] bg-terracotta text-cream px-8 py-3.5 rounded-sm hover:bg-cream hover:text-charcoal transition-colors font-medium shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{fundCard.button_text || "Contribute to Honeymoon Fund"}</span>
                    <Sparkles size={13} />
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
                className="p-8 md:p-10 border border-cream/20 bg-charcoal/40 backdrop-blur-md rounded-sm text-center relative overflow-hidden group hover:border-terracotta/50 transition-all duration-500 flex flex-col justify-between"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 mx-auto rounded-full bg-cream/10 border border-cream/20 flex items-center justify-center text-terracotta mb-6 group-hover:scale-105 transition-transform duration-300">
                    <Gift size={24} strokeWidth={1.5} />
                  </div>
                  <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-terracotta font-semibold block mb-1">
                    Curated Wishlist
                  </span>
                  <h3 className="text-2xl md:text-3xl font-serif text-cream mb-2 tracking-wide">
                    {storeCard.title || "Gift Registry"}
                  </h3>
                  <p className="font-sans text-xs md:text-sm text-cream/80 tracking-wide mb-6 leading-relaxed max-w-sm mx-auto">
                    {storeCard.description}
                  </p>

                  {/* Prominent Live Items Counter Display */}
                  <div className="my-5 p-4 rounded-sm bg-cream/10 border border-cream/15 backdrop-blur-xs max-w-xs mx-auto">
                    <div className="flex items-center justify-center gap-1.5 mb-1.5 text-[9px] uppercase tracking-widest text-emerald-300 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Live Registry Counter</span>
                    </div>
                    <div className="text-3xl md:text-4xl font-serif text-cream font-medium">
                      <AnimatedCounter value={purchasedItemsCount} />{" "}
                      <span className="text-xl md:text-2xl text-cream/70 font-normal">of {totalItemsCount}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-cream/60 mt-1">
                      Gifts Purchased So Far
                    </div>

                    {totalItemsCount > 0 && (
                      <div className="mt-3 pt-3 border-t border-cream/10">
                        <div className="flex justify-between text-[10px] text-cream/70 mb-1">
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
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/registry/items"
                    className="w-full font-sans text-[10px] uppercase tracking-[0.2em] bg-terracotta text-cream px-8 py-3.5 rounded-sm hover:bg-cream hover:text-charcoal transition-colors font-medium shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{storeCard.button_text || "View Registry Items"}</span>
                    <ShoppingBag size={13} />
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
