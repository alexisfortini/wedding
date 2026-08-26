"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Gift, X, ExternalLink, ShoppingBag, CreditCard, Sparkles, CheckCircle2, Image as ImageIcon, Check, Loader2 } from "lucide-react";
import { mockDatabase } from "@/lib/mockDatabase";
import { getResponsiveImageStyle } from "@/lib/imageHelper";
import registryConfigDefault from "@config/ui/registry.json";
import imagesConfigDefault from "@config/ui/images.json";

export default function Registry() {
  const [config, setConfig] = useState<any>(registryConfigDefault);
  const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);
  const [activeModal, setActiveModal] = useState<"fund" | "items" | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Claim modal state
  const [claimingItem, setClaimingItem] = useState<any | null>(null);
  const [claimName, setClaimName] = useState<string>("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState<boolean>(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    mockDatabase.getSiteConfig("registry", registryConfigDefault).then(setConfig);
    mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setClaimingItem(null);
    setClaimSuccessMessage(null);
  }, []);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (activeModal || claimingItem) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeModal, claimingItem]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (claimingItem) {
          setClaimingItem(null);
        } else {
          closeModal();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, claimingItem]);

  // Handle guest claiming / marking as purchased
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
        setClaimName("");
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

  // Backward compatibility support for cash_fund vs honeymoon_fund
  const cashFund = config.cash_fund || config.honeymoon_fund || registryConfigDefault.cash_fund;
  const isCashFundEnabled = cashFund && cashFund.enabled !== false;

  const rawItems = config.items || registryConfigDefault.items || [];
  const itemsList = useMemo(() => {
    return rawItems.filter((item: any) => item.enabled !== false);
  }, [rawItems]);

  const rawStores = config.stores || registryConfigDefault.stores || [];
  const storesList = useMemo(() => {
    return rawStores.filter((store: any) => store.enabled !== false);
  }, [rawStores]);

  const isStoreSectionEnabled = itemsList.length > 0 || storesList.length > 0;

  const mainCards = config.main_cards || registryConfigDefault.main_cards || {};
  const fundCard = mainCards.cash_fund || mainCards.honeymoon || {
    title: "Cash & Experience Fund",
    description: "Contribute toward our getaway, home projects, and upcoming memories.",
    button_text: "Contribute to Fund"
  };
  const storeCard = mainCards.store || {
    title: "Gift & Item Registry",
    description: "Browse curated items for our home and partner store registries.",
    button_text: "View Registry Items"
  };

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
              {config.coming_soon_message || "Having you celebrate with us is the greatest gift of all. We are currently finalizing our registry & cash fund options. Please check back soon!"}
            </p>
          </motion.div>
        ) : (
          <div className={`grid gap-8 ${isCashFundEnabled && isStoreSectionEnabled ? "md:grid-cols-2" : "max-w-md mx-auto grid-cols-1"}`}>
            {/* Card 1: Cash / Experience Fund */}
            {isCashFundEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                viewport={{ once: true }}
                className="p-10 border border-cream/20 bg-charcoal/40 backdrop-blur-md rounded-sm text-center relative overflow-hidden group hover:border-terracotta/50 transition-all duration-500 flex flex-col justify-between"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 mx-auto rounded-full bg-cream/10 border border-cream/20 flex items-center justify-center text-terracotta mb-6 group-hover:scale-105 transition-transform duration-300">
                    <Heart size={24} strokeWidth={1.5} className="fill-current text-terracotta/40" />
                  </div>
                  <h3 className="text-2xl font-serif text-cream mb-3 tracking-wide">
                    {fundCard.title || cashFund.title || "Cash Fund"}
                  </h3>
                  <p className="font-sans text-sm text-cream/70 tracking-wide mb-8 leading-relaxed">
                    {fundCard.description || cashFund.description}
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => setActiveModal("fund")}
                    className="w-full font-sans text-[10px] uppercase tracking-[0.2em] bg-terracotta text-cream px-8 py-3.5 rounded-sm hover:bg-cream hover:text-charcoal transition-colors font-medium shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{fundCard.button_text || "Contribute to Fund"}</span>
                    <Sparkles size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Card 2: Gift & Item Registry */}
            {isStoreSectionEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
                className="p-10 border border-cream/20 bg-charcoal/40 backdrop-blur-md rounded-sm text-center relative overflow-hidden group hover:border-terracotta/50 transition-all duration-500 flex flex-col justify-between"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 mx-auto rounded-full bg-cream/10 border border-cream/20 flex items-center justify-center text-terracotta mb-6 group-hover:scale-105 transition-transform duration-300">
                    <Gift size={24} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-2xl font-serif text-cream mb-3 tracking-wide">
                    {storeCard.title || "Gift & Item Registry"}
                  </h3>
                  <p className="font-sans text-sm text-cream/70 tracking-wide mb-8 leading-relaxed">
                    {storeCard.description}
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => setActiveModal("items")}
                    className="w-full font-sans text-[10px] uppercase tracking-[0.2em] bg-cream/15 text-cream border border-cream/30 px-8 py-3.5 rounded-sm hover:bg-cream hover:text-charcoal transition-colors font-medium shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{storeCard.button_text || "View Registry Items"}</span>
                    <ShoppingBag size={13} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* POPUP MODALS */}
      <AnimatePresence>
        {/* MODAL 1: Cash / Experience Fund Modal */}
        {activeModal === "fund" && isCashFundEnabled && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-charcoal/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-xl bg-white border border-sage/20 rounded-sm shadow-2xl overflow-hidden z-10 my-8"
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="bg-cream/40 p-6 border-b border-sage/15 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-terracotta/15 flex items-center justify-center text-terracotta">
                    <Heart size={16} className="fill-current text-terracotta/40" />
                  </div>
                  <div>
                    <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-terracotta font-semibold block">{cashFund.tag || "Cash Fund"}</span>
                    <h3 className="text-xl font-serif text-charcoal">{cashFund.title}</h3>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-charcoal/5 hover:bg-charcoal/10 flex items-center justify-center text-charcoal/60 hover:text-charcoal transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 md:p-8 space-y-6">
                <div className="bg-cream/20 border border-sage/20 p-6 rounded-sm text-center space-y-4">
                  {cashFund.subtitle && (
                    <h4 className="text-2xl font-serif text-charcoal">{cashFund.subtitle}</h4>
                  )}
                  
                  <p className="font-sans text-sm text-charcoal/70 tracking-wide leading-relaxed max-w-md mx-auto">
                    {cashFund.description}
                  </p>

                  {cashFund.suggested_amount && (
                    <div className="inline-flex items-center gap-2 text-xs font-sans text-charcoal/60 bg-white border border-sage/20 px-4 py-1.5 rounded-full font-medium shadow-xs">
                      <CreditCard size={13} className="text-terracotta" />
                      <span>{cashFund.suggested_amount}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <a
                    href={cashFund.payment_url || cashFund.stripe_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full font-sans text-[11px] uppercase tracking-[0.2em] bg-terracotta text-cream py-4 rounded-sm hover:bg-charcoal hover:text-cream transition-colors font-medium shadow-md flex items-center justify-center gap-2 group"
                  >
                    <span>{cashFund.button_text || "Contribute to Fund"}</span>
                    <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </a>
                  
                  <p className="text-[10px] font-sans text-charcoal/40 text-center tracking-wide">
                    Secured payment • Credit cards, debit cards & Apple Pay accepted
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 2: Curated Gift & Store Registry Modal */}
        {activeModal === "items" && isStoreSectionEnabled && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-charcoal/80 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-4xl bg-white border border-sage/20 rounded-sm shadow-2xl overflow-hidden z-10 my-4 md:my-8 max-h-[90vh] flex flex-col"
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="bg-cream/40 p-5 md:p-6 border-b border-sage/15 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-terracotta/15 flex items-center justify-center text-terracotta">
                    <Gift size={18} />
                  </div>
                  <div>
                    <span className="font-sans text-[9px] uppercase tracking-[0.25em] text-terracotta font-semibold block">Curated Wishlist</span>
                    <h3 className="text-xl md:text-2xl font-serif text-charcoal">{storeCard.title || "Gift & Item Registry"}</h3>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-charcoal/5 hover:bg-charcoal/10 flex items-center justify-center text-charcoal/60 hover:text-charcoal transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Modal Body */}
              <div className="p-5 md:p-8 overflow-y-auto space-y-8">
                {/* Category Filter Pills (if more than 1 category) */}
                {categories.length > 2 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`font-sans text-xs px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap font-medium ${
                          selectedCategory === cat
                            ? "bg-terracotta text-cream shadow-xs"
                            : "bg-cream/40 text-charcoal/70 hover:bg-cream/70 border border-sage/15"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* SECTION A: Curated Product Items */}
                {itemsList.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-sage/15 pb-2">
                      <h4 className="font-serif text-lg text-charcoal flex items-center gap-2">
                        <span>Curated Registry Items</span>
                        <span className="text-xs font-sans font-normal text-charcoal/50">({filteredItems.length})</span>
                      </h4>
                      <span className="text-[10px] font-sans uppercase tracking-wider text-charcoal/50 hidden sm:inline">Direct Links</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredItems.map((item: any) => {
                        const isPurchased = Boolean(item.is_purchased);
                        const storeName = item.store_name || item.store || "Store Registry";
                        const storeLink = item.store_url;
                        const itemLink = item.item_url || item.url || "#";

                        return (
                          <div 
                            key={item.id || item.title}
                            className={`bg-cream/10 border border-sage/20 rounded-sm flex flex-col justify-between overflow-hidden transition-all duration-300 hover:border-terracotta/40 hover:shadow-md group ${
                              isPurchased ? "bg-cream/5" : ""
                            }`}
                          >
                            {/* Top Image Container */}
                            <div className="relative aspect-square w-full bg-cream/30 overflow-hidden border-b border-sage/15 flex items-center justify-center">
                              {item.image_url ? (
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
                                <div className="text-charcoal/25 flex flex-col items-center gap-1.5 p-4 text-center">
                                  <ImageIcon size={28} strokeWidth={1.5} />
                                  <span className="text-[10px] font-sans uppercase tracking-wider">Gift Item</span>
                                </div>
                              )}

                              {/* Badges Overlay */}
                              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1.5 pointer-events-none">
                                <div className="flex flex-col gap-1 items-start">
                                  {storeName && (
                                    <span className="font-sans text-[9px] uppercase tracking-wider bg-charcoal/85 text-cream px-2 py-0.5 rounded font-medium shadow-xs backdrop-blur-xs">
                                      {storeName}
                                    </span>
                                  )}
                                  {item.category && (
                                    <span className="font-sans text-[8px] uppercase tracking-wider bg-white/90 text-charcoal/80 px-1.5 py-0.5 rounded font-medium border border-charcoal/10 shadow-2xs backdrop-blur-xs">
                                      {item.category}
                                    </span>
                                  )}
                                </div>

                                {isPurchased && (
                                  <span className="font-sans text-[9px] uppercase tracking-wider bg-emerald-800 text-white px-2.5 py-1 rounded font-semibold shadow-sm flex items-center gap-1">
                                    <CheckCircle2 size={11} />
                                    <span>Purchased</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Details Body */}
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                              <div className="space-y-1.5">
                                <div className="flex items-baseline justify-between gap-2">
                                  <h5 className={`font-serif text-base leading-snug transition-colors line-clamp-2 ${
                                    isPurchased ? "text-charcoal/75" : "text-charcoal group-hover:text-terracotta"
                                  }`}>
                                    {item.title}
                                  </h5>
                                  {item.price && (
                                    <span className="font-sans text-xs font-semibold text-terracotta shrink-0 bg-white border border-sage/20 px-2 py-0.5 rounded-sm shadow-2xs">
                                      {item.price}
                                    </span>
                                  )}
                                </div>

                                {item.description && (
                                  <p className="font-sans text-xs text-charcoal/65 leading-relaxed line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="space-y-2 pt-2 border-t border-sage/10">
                                {isPurchased ? (
                                  /* CLAIMED / PURCHASED STATE */
                                  <div className="space-y-2">
                                    <div 
                                      className="w-full font-sans text-[10px] uppercase tracking-[0.16em] bg-emerald-50 border border-emerald-300 text-emerald-800 py-2.5 px-3 rounded-sm font-medium flex items-center justify-center gap-1.5 select-none cursor-default"
                                      title="This gift has already been purchased"
                                    >
                                      <Check size={12} className="text-emerald-700" />
                                      <span>Purchased / Claimed</span>
                                    </div>

                                    {/* Retain link for specs / order details */}
                                    <a
                                      href={itemLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full font-sans text-[9px] text-charcoal/60 hover:text-terracotta transition-colors text-center block pt-0.5 underline underline-offset-2"
                                    >
                                      View item specs & details on {storeName} →
                                    </a>
                                  </div>
                                ) : (
                                  /* AVAILABLE STATE */
                                  <div className="space-y-2">
                                    <a
                                      href={itemLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-full font-sans text-[10px] uppercase tracking-[0.16em] bg-terracotta text-cream hover:bg-charcoal py-2.5 px-3 rounded-sm transition-colors font-medium flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                      <span>View on {storeName}</span>
                                      <ExternalLink size={11} />
                                    </a>

                                    {/* Guest Self-Report: "I've purchased this gift" */}
                                    <button
                                      onClick={() => {
                                        setClaimingItem(item);
                                        setClaimName("");
                                        setClaimSuccessMessage(null);
                                      }}
                                      className="w-full font-sans text-[9px] text-charcoal/60 hover:text-emerald-700 hover:bg-emerald-50/70 border border-dashed border-sage/30 hover:border-emerald-400 py-1.5 px-2 rounded-sm transition-all text-center block cursor-pointer"
                                    >
                                      ✓ Already bought this? Mark as purchased
                                    </button>
                                  </div>
                                )}

                                {storeLink && !isPurchased && (
                                  <a
                                    href={storeLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full font-sans text-[9px] text-charcoal/50 hover:text-terracotta transition-colors text-center block pt-0.5"
                                  >
                                    View full {storeName} registry →
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION B: Complete Store Registry Links */}
                {storesList.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-sage/20">
                    <div className="text-center space-y-1 max-w-md mx-auto">
                      <h4 className="font-serif text-lg text-charcoal">Want to browse our complete store lists?</h4>
                      <p className="font-sans text-xs text-charcoal/60">
                        Visit our full partner store registries to see all items in one place.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      {storesList.map((store: any) => (
                        <a
                          key={store.id || store.name}
                          href={store.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-[10px] uppercase tracking-[0.15em] bg-white border border-sage/30 hover:border-terracotta hover:bg-terracotta hover:text-cream text-charcoal px-4 py-2.5 rounded-sm transition-all font-medium flex items-center gap-1.5 shadow-2xs group"
                        >
                          <ShoppingBag size={12} className="text-terracotta group-hover:text-cream transition-colors" />
                          <span>Browse full {store.name} registry</span>
                          <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL 3: Guest Self-Report Confirmation Dialog */}
        {claimingItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingClaim && setClaimingItem(null)}
              className="fixed inset-0 bg-charcoal/85 backdrop-blur-md"
            />

            {/* Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-md bg-white border border-sage/30 rounded-sm shadow-2xl overflow-hidden z-20 p-6 md:p-7 space-y-5"
              role="dialog"
              aria-modal="true"
            >
              {claimSuccessMessage ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="font-serif text-xl text-charcoal">Marked as Purchased!</h4>
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
                      Marking this will update the registry so other guests know not to purchase duplicates.
                    </p>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">
                        Your Name (Optional — so the couple can thank you!):
                      </label>
                      <input
                        type="text"
                        value={claimName}
                        onChange={(e) => setClaimName(e.target.value)}
                        placeholder="e.g. Grandma Helen / The Fortini Family"
                        className="w-full border border-sage/35 p-2 bg-cream/20 text-sm outline-none focus:border-emerald-600 rounded-sm"
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
    </section>
  );
}
