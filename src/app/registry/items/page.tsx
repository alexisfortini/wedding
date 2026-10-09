"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Gift, ExternalLink, Check, ShoppingBag,
  Loader2, CheckCircle2, X, ArrowRight, Heart
} from "lucide-react";
import { mockDatabase } from "@/lib/mockDatabase";
import defaultRegistryConfig from "@config/ui/registry.json";

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const duration = 1000;

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

export default function RegistryItemsPage() {
  const [config, setConfig] = useState<any>(defaultRegistryConfig);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Claim modal state
  const [claimingItem, setClaimingItem] = useState<any | null>(null);
  const [claimName, setClaimName] = useState<string>("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState<boolean>(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    mockDatabase.getSiteConfig("registry", defaultRegistryConfig).then(setConfig);

    // Auto pre-fill guest name if session exists
    try {
      const savedGuestStr = localStorage.getItem("wedding_guest");
      if (savedGuestStr) {
        const g = JSON.parse(savedGuestStr);
        if (g?.first_name) {
          setClaimName(`${g.first_name} ${g.last_name || ""}`.trim());
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleConfirmClaim = async () => {
    if (!claimingItem) return;

    setIsSubmittingClaim(true);
    try {
      const res = await fetch("/api/registry-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: claimingItem.id,
          isPurchased: true,
          purchasedBy: claimName.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success && data.registryConfig) {
        setConfig(data.registryConfig);
      } else {
        // Optimistic local update fallback
        setConfig((prev: any) => ({
          ...prev,
          items: (prev.items || []).map((item: any) =>
            item.id === claimingItem.id
              ? { ...item, is_purchased: true, purchased_by: claimName.trim() || "A wedding guest" }
              : item
          )
        }));
      }

      setClaimSuccessMessage(`Thank you so much! "${claimingItem.title}" has been marked as claimed.`);
      setTimeout(() => {
        setClaimingItem(null);
        setClaimSuccessMessage(null);
      }, 2200);
    } catch (err) {
      console.error("Failed to claim item:", err);
      // Optimistic local update
      setConfig((prev: any) => ({
        ...prev,
        items: (prev.items || []).map((item: any) =>
          item.id === claimingItem.id
            ? { ...item, is_purchased: true, purchased_by: claimName.trim() || "A wedding guest" }
            : item
        )
      }));
      setClaimingItem(null);
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const rawItems = config.items || (defaultRegistryConfig as any).items || [];
  const itemsList = useMemo(() => {
    return rawItems.filter((item: any) => item.enabled !== false);
  }, [rawItems]);

  const rawStores = config.stores || (defaultRegistryConfig as any).stores || [];
  const storesList = useMemo(() => {
    return rawStores.filter((store: any) => store.enabled !== false);
  }, [rawStores]);

  const purchasedItemsCount = useMemo(() => {
    return itemsList.filter((item: any) => Boolean(item.is_purchased)).length;
  }, [itemsList]);
  const totalItemsCount = itemsList.length;
  const purchasedPercentage = totalItemsCount > 0 ? Math.round((purchasedItemsCount / totalItemsCount) * 100) : 0;

  // Categories extracted from items
  const categories = useMemo(() => {
    const set = new Set<string>();
    itemsList.forEach((item: any) => {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    });
    return ["All", ...Array.from(set)];
  }, [itemsList]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === "All") return itemsList;
    return itemsList.filter((item: any) => item.category?.trim().toLowerCase() === selectedCategory.toLowerCase());
  }, [itemsList, selectedCategory]);

  const mainCards = config.main_cards || (defaultRegistryConfig as any).main_cards || {};
  const storeCard = mainCards.store || {
    title: "Gift Registry",
    description: "Browse curated items for our home and partner store registries."
  };

  return (
    <main className="min-h-screen bg-cream text-charcoal py-12 md:py-20 px-4 sm:px-6 md:px-12">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Navigation & Header */}
        <div>
          <Link
            href="/#registry"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-charcoal/60 hover:text-terracotta transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Wedding Site</span>
          </Link>

          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-terracotta/10 border border-terracotta/20 text-terracotta text-xs font-semibold uppercase tracking-widest">
              <Gift size={13} />
              <span>Curated Wishlist</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-charcoal">
              {storeCard.title || "Gift Registry"}
            </h1>
            <p className="text-charcoal/70 font-sans text-sm md:text-base leading-relaxed">
              {storeCard.description || "Browse curated items for our home and partner store registries. Thank you for thinking of us as we build our lives together!"}
            </p>
          </div>
        </div>

        {/* Live Items Counter Banner */}
        <div className="bg-white border border-sage/20 rounded-sm p-6 shadow-sm text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-sans uppercase tracking-wider font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Wishlist Status</span>
          </div>
          <div className="text-3xl sm:text-4xl font-serif text-charcoal font-medium">
            <AnimatedCounter value={purchasedItemsCount} />{" "}
            <span className="text-xl sm:text-2xl text-charcoal/60 font-normal">of {totalItemsCount}</span>
          </div>
          <div className="text-xs uppercase tracking-wider text-charcoal/50 mt-1">
            Gifts Claimed So Far
          </div>

          {totalItemsCount > 0 && (
            <div className="mt-4 pt-4 border-t border-sage/15 max-w-md mx-auto">
              <div className="flex justify-between text-xs text-charcoal/70 mb-1.5 font-medium">
                <span>Progress</span>
                <span>{purchasedPercentage}% of Wishlist Claimed</span>
              </div>
              <div className="w-full h-2 bg-cream/70 rounded-full overflow-hidden border border-sage/15">
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

        {/* Category Filters */}
        {categories.length > 2 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`font-sans text-xs px-4 py-2 rounded-full transition-all cursor-pointer whitespace-nowrap font-medium ${
                  selectedCategory === cat
                    ? "bg-terracotta text-cream shadow-xs font-semibold"
                    : "bg-white text-charcoal/70 hover:bg-cream/70 border border-sage/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid of Curated Items */}
        {itemsList.length === 0 ? (
          <div className="text-center py-16 bg-white border border-sage/20 rounded-sm">
            <p className="font-serif text-xl text-charcoal/60">No registry items configured yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-sage/20 pb-3">
              <h3 className="font-serif text-2xl text-charcoal flex items-center gap-2">
                <span>Curated Registry Items</span>
                <span className="text-sm font-sans font-normal text-charcoal/50">({filteredItems.length})</span>
              </h3>
              <span className="text-xs font-sans text-charcoal/50">Direct Links to Stores</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item: any) => {
                const isPurchased = Boolean(item.is_purchased);
                const storeName = item.store_name || item.store || "Store Registry";
                const itemLink = item.item_url || item.url || "#";

                return (
                  <div
                    key={item.id || item.title}
                    className={`bg-white border border-sage/20 rounded-sm flex flex-col justify-between overflow-hidden transition-all duration-300 hover:border-terracotta/40 hover:shadow-md group ${
                      isPurchased ? "bg-cream/10" : ""
                    }`}
                  >
                    {/* Top Image Container */}
                    <div className="relative aspect-square w-full bg-cream/30 overflow-hidden border-b border-sage/15 flex items-center justify-center">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className={`w-full h-full object-cover transition-transform duration-500 ${
                            isPurchased ? "opacity-75 grayscale-[25%]" : "group-hover:scale-105"
                          }`}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-cream/50 flex items-center justify-center text-charcoal/30">
                          <Gift size={28} />
                        </div>
                      )}

                      {/* Store Badge */}
                      <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 text-[10px] font-sans uppercase tracking-wider text-charcoal/80 rounded-sm border border-sage/20 shadow-2xs font-medium">
                        {storeName}
                      </span>

                      {/* Claimed Badge */}
                      {isPurchased && (
                        <div className="absolute top-3 right-3 bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-sans uppercase tracking-wider rounded-sm shadow-sm flex items-center gap-1 font-semibold">
                          <Check size={11} />
                          <span>Purchased</span>
                        </div>
                      )}
                    </div>

                    {/* Middle: Title, Notes & Price */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-serif text-lg text-charcoal leading-snug group-hover:text-terracotta transition-colors">
                          {item.title}
                        </h4>
                        {item.notes && (
                          <p className="font-sans text-xs text-charcoal/60 mt-1 line-clamp-2 leading-relaxed">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs font-sans pt-2 border-t border-sage/10">
                        {item.price && (
                          <span className="font-mono font-semibold text-charcoal">
                            {item.price.startsWith("$") ? item.price : `$${item.price}`}
                          </span>
                        )}
                        {item.category && (
                          <span className="text-[10px] uppercase tracking-wider text-charcoal/40 font-medium">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Action Buttons */}
                    <div className="p-5 pt-0">
                      {isPurchased ? (
                        <div className="space-y-2">
                          <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/60 rounded-sm text-center">
                            <span className="text-xs font-serif italic text-emerald-800">
                              {item.purchased_by
                                ? `Gifted by ${item.purchased_by} ❤️`
                                : "Marked as purchased by a guest"}
                            </span>
                          </div>
                          {itemLink && itemLink !== "#" && (
                            <a
                              href={itemLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full text-center block text-[10px] uppercase tracking-wider text-charcoal/50 hover:text-charcoal py-1 transition-colors"
                            >
                              View Item Details ↗
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <a
                            href={itemLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 font-sans text-[11px] uppercase tracking-wider bg-terracotta text-cream py-2.5 px-3 rounded-sm hover:bg-charcoal transition-colors font-medium text-center flex items-center justify-center gap-1.5 shadow-2xs group/btn"
                          >
                            <span>Buy at {storeName}</span>
                            <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setClaimingItem(item);
                            }}
                            className="font-sans text-[10px] uppercase tracking-wider bg-cream/30 hover:bg-cream/80 text-charcoal border border-sage/25 py-2.5 px-3 rounded-sm transition-colors font-medium whitespace-nowrap cursor-pointer"
                            title="Let us know you purchased this so others don't buy duplicate gifts"
                          >
                            Mark Claimed
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION B: Partner Stores (if configured) */}
        {storesList.length > 0 && (
          <div className="pt-8 border-t border-sage/20 space-y-6">
            <div className="text-center space-y-1">
              <h3 className="font-serif text-2xl text-charcoal">Partner Store Registries</h3>
              <p className="font-sans text-xs text-charcoal/60">
                You can also browse our full registered collections directly on these retailers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {storesList.map((store: any) => (
                <a
                  key={store.name || store.url}
                  href={store.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 bg-white border border-sage/20 rounded-sm hover:border-terracotta/50 hover:shadow-md transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cream/40 flex items-center justify-center text-charcoal/70 group-hover:text-terracotta transition-colors">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <h4 className="font-serif text-base text-charcoal font-medium group-hover:text-terracotta transition-colors">
                        {store.name}
                      </h4>
                      <span className="text-[10px] font-sans uppercase tracking-wider text-charcoal/40">
                        View Complete Registry
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-charcoal/40 group-hover:text-terracotta group-hover:translate-x-0.5 transition-all" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer Alternative Link */}
        <div className="pt-8 border-t border-sage/20 text-center">
          <p className="text-sm font-sans text-charcoal/70">
            Prefer to contribute directly toward our honeymoon fund?{" "}
            <Link
              href="/registry/fund"
              className="font-semibold text-terracotta hover:underline inline-flex items-center gap-1"
            >
              <span>Contribute to Honeymoon Fund</span>
              <ArrowRight size={13} />
            </Link>
          </p>
        </div>

      </div>

      {/* CLAIM CONFIRMATION MODAL */}
      <AnimatePresence>
        {claimingItem && (
          <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingClaim && setClaimingItem(null)}
              className="fixed inset-0 bg-charcoal/80 backdrop-blur-md"
            />

            {/* Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-md bg-white border border-sage/30 rounded-sm shadow-2xl overflow-hidden z-10 p-6 md:p-7 space-y-5 my-auto"
              role="dialog"
              aria-modal="true"
            >
              {claimSuccessMessage ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="font-serif text-2xl text-charcoal">Marked as Purchased!</h4>
                  <p className="font-sans text-xs text-charcoal/70 max-w-xs mx-auto leading-relaxed">
                    {claimSuccessMessage}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-sage/15 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check size={16} />
                      </div>
                      <div>
                        <span className="font-sans text-[9px] uppercase tracking-wider text-emerald-800 font-semibold block">Guest Self-Report</span>
                        <h4 className="font-serif text-lg text-charcoal">Mark as Purchased</h4>
                      </div>
                    </div>
                    <button
                      onClick={() => !isSubmittingClaim && setClaimingItem(null)}
                      className="text-charcoal/50 hover:text-charcoal p-1 cursor-pointer"
                      disabled={isSubmittingClaim}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs font-sans text-charcoal/80">
                    <p className="leading-relaxed">
                      Thank you so much! Did you purchase <strong className="font-serif text-sm text-charcoal font-semibold">{claimingItem.title}</strong>?
                    </p>
                    <p className="text-charcoal/60 leading-relaxed">
                      Marking this will update our live registry status so other guests know not to purchase duplicates.
                    </p>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">
                        Your Name (Optional — so the couple can thank you!):
                      </label>
                      <input
                        type="text"
                        value={claimName}
                        onChange={(e) => setClaimName(e.target.value)}
                        placeholder="e.g. Grandma Helen or The Fortini Family"
                        className="w-full border border-sage/35 p-2.5 bg-cream/20 text-xs outline-none focus:border-emerald-600 rounded-sm"
                        disabled={isSubmittingClaim}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleConfirmClaim}
                      disabled={isSubmittingClaim}
                      className="flex-1 font-sans text-[10px] uppercase tracking-[0.18em] bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-4 rounded-sm transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {isSubmittingClaim ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check size={13} />
                          <span>Confirm & Mark as Claimed</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setClaimingItem(null)}
                      disabled={isSubmittingClaim}
                      className="font-sans text-[10px] uppercase tracking-wider text-charcoal/60 hover:text-charcoal py-3 px-4 border border-sage/25 hover:bg-cream/40 rounded-sm transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
