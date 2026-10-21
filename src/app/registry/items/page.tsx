"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Gift, ExternalLink, Check, ShoppingBag,
  Loader2, CheckCircle2, X, ArrowRight, Heart
} from "lucide-react";
import { giftPrice, giftStatus } from "@/lib/registry";
import defaultRegistryConfig from "@config/ui/registry.json";

import { useDialog } from "@/lib/useDialog";

export default function RegistryItemsPage() {
  const [config, setConfig] = useState<any>(defaultRegistryConfig);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [view, setView] = useState<"gifts" | "stores">("gifts");
  const [storeFilter, setStoreFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [budget, setBudget] = useState("All");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Claim modal state
  const [claimingItem, setClaimingItem] = useState<any | null>(null);
  const [claimName, setClaimName] = useState<string>("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState<boolean>(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);

  const [claimError, setClaimError] = useState("");
  const closeClaim = () => { if (!isSubmittingClaim) { setClaimingItem(null); setClaimSuccessMessage(null); setClaimError(""); } };
  const dialogRef = useDialog(claimingItem !== null, closeClaim);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/registry", { cache: "no-store", signal: AbortSignal.timeout(15000) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error("Unable to check the registry. Please refresh or visit a store registry.");
        if (active) { setConfig(data.value); setLoaded(true); setLoadError(""); }
      } catch (error) { if (active) setLoadError(error instanceof Error ? error.message : "Unable to check the registry."); }
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);

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
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);

  const handleConfirmClaim = async () => {
    if (!claimingItem || isSubmittingClaim) return;
    setIsSubmittingClaim(true); setClaimError("");
    try {
      const res = await fetch("/api/registry-claim", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ itemId: claimingItem.id, isPurchased: true, purchasedBy: claimName.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.registryConfig) throw new Error(data.error || "Your claim couldn't be saved. Please try again.");
      setConfig(data.registryConfig);
      setClaimSuccessMessage(`Thank you! "${claimingItem.title}" has been marked as claimed.`);
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : "Your claim couldn't be saved. Please try again.");
    } finally { setIsSubmittingClaim(false); }
  };

  const rawItems = config.items || (defaultRegistryConfig as any).items || [];
  const itemsList = useMemo(() => {
    return loaded ? rawItems.filter((item: any) => item.enabled !== false) : [];
  }, [rawItems, loaded]);

  const rawStores = config.stores || (defaultRegistryConfig as any).stores || [];
  const storesList = useMemo(() => {
    return rawStores.filter((store: any) => store.enabled !== false);
  }, [rawStores]);

  const purchasedItemsCount = useMemo(() => {
    return itemsList.filter((item: any) => ["purchased", "reported"].includes(giftStatus(item))).length;
  }, [itemsList]);
  const totalItemsCount = itemsList.length;

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
    return itemsList.filter((item: any) => {
      const price = giftPrice(item);
      return (selectedCategory === "All" || item.category?.trim().toLowerCase() === selectedCategory.toLowerCase()) &&
        (storeFilter === "All" || (item.store_name || item.store) === storeFilter) &&
        (statusFilter === "All" || giftStatus(item) === statusFilter) &&
        (budget === "All" || (price !== null && (budget === "under50" ? price < 50 : budget === "50to150" ? price >= 50 && price <= 150 : price > 150))) &&
        `${item.title} ${item.description || ""} ${item.store_name || ""}`.toLowerCase().includes(search.toLowerCase());
    });
  }, [itemsList, selectedCategory, storeFilter, statusFilter, budget, search]);

  const mainCards = config.main_cards || (defaultRegistryConfig as any).main_cards || {};
  const storeCard = mainCards.store || {
    title: "Gift Registry",
    description: "Browse curated items for our home and partner store registries."
  };

  return (
    <main className="min-h-screen bg-cream text-charcoal py-8 md:py-12 px-4 sm:px-6 md:px-12">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Navigation & Header */}
        <div>
          <Link
            href="/#registry"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-label text-muted hover:text-action transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Wedding Site</span>
          </Link>

          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 text-action text-xs font-semibold uppercase tracking-label">
              <Gift size={13} />
              <span>Curated Wishlist</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-charcoal text-balance">
              {storeCard.title || "Gift Registry"}
            </h1>
            <p className="text-charcoal/80 font-sans text-copy md:text-base leading-relaxed">
              {storeCard.description || "Browse curated items for our home and partner store registries. Thank you for thinking of us as we build our lives together!"}
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-2" aria-label="Registry view">
          <button onClick={() => setView("gifts")} aria-pressed={view === "gifts"} className={`px-6 py-3 rounded-full border border-line ${view === "gifts" ? "bg-action text-cream" : "bg-surface"}`}>All Gifts</button>
          <button onClick={() => setView("stores")} aria-pressed={view === "stores"} className={`px-6 py-3 rounded-full border border-line ${view === "stores" ? "bg-action text-cream" : "bg-surface"}`}>Shop by Store</button>
        </div>
        {loadError && <p role="alert" className="text-center text-danger">{loadError}</p>}
        {view === "gifts" && <>
        {loaded && <p className="text-center text-sm text-muted">{totalItemsCount} gift ideas · {purchasedItemsCount} claimed</p>}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans text-copy">
          <label className="space-y-1">Search gifts<input aria-label="Search gifts" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find something special" className="block w-full p-3 bg-surface border border-line rounded-sm" /></label>
          <label className="space-y-1">Store<select aria-label="Filter by store" value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="block w-full p-3 bg-surface border border-line rounded-sm"><option value="All">All stores</option>{Array.from(new Set<string>(itemsList.map((item: any) => item.store_name || item.store).filter(Boolean))).sort().map(name => <option key={name}>{name}</option>)}</select></label>
          <label className="space-y-1">Price<select aria-label="Filter by price" value={budget} onChange={e => setBudget(e.target.value)} className="block w-full p-3 bg-surface border border-line rounded-sm"><option value="All">All prices</option><option value="under50">Under $50</option><option value="50to150">$50–$150</option><option value="over150">Over $150</option></select></label>
          <label className="space-y-1">Status<select aria-label="Filter by gift status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="block w-full p-3 bg-surface border border-line rounded-sm"><option value="All">All gifts</option><option value="available">Still needed</option><option value="reported">Reported gifted</option><option value="purchased">Purchased</option><option value="unavailable">Out of stock</option></select></label>
        </div>
        <p className="font-sans text-copy text-muted text-center">Please buy through the store registry so your gift is recorded there. Guest reports are confirmed separately; store updates can take time. Prices and availability are confirmed at checkout.</p>

        {/* Category Filters */}
        {categories.length > 2 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`font-sans text-xs px-4 py-2 rounded-full transition-all cursor-pointer whitespace-nowrap font-medium ${
                  selectedCategory === cat
                    ? "bg-action text-cream shadow-card font-semibold"
                    : "bg-surface text-charcoal/80 hover:bg-cream/70 border border-line"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid of Curated Items */}
        {itemsList.length === 0 ? (
          <div className="text-center py-16 bg-surface border border-line rounded-sm">
            <p className="font-serif text-xl text-muted leading-relaxed">{!loaded ? "Checking our gift list…" : "We're putting the finishing touches on our gift list. You can browse our store registries below."}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
              <h3 className="font-serif text-2xl text-charcoal flex items-center gap-2 text-balance">
                <span>Curated Registry Items</span>
                <span className="text-sm font-sans font-normal text-muted">({filteredItems.length})</span>
              </h3>
              <span className="text-xs font-sans text-muted">Choose a gift, then shop the store registry</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {filteredItems.map((item: any) => {
                const status = giftStatus(item);
                const isPurchased = status === "purchased" || (status === "reported" && (item.quantity_purchased ?? 0) + (item.guest_reported_quantity ?? 0) >= (item.quantity_requested ?? 1));
                const storeName = item.store_name || item.store || "Store Registry";
                const itemLink = item.registry_added && item.store_url ? item.store_url : item.item_url || item.url || "#";
                const itemDescription = item.description || item.notes || "";

                return (
                  <div
                    key={item.id || item.title}
                    className={`h-full bg-surface border border-line rounded-sm flex flex-col justify-between overflow-hidden transition-all duration-300 hover:border-terracotta/40 hover:shadow-card group ${
                      isPurchased ? "bg-cream/10" : ""
                    }`}
                  >
                    {/* Top Image Container */}
                    <div className="relative aspect-square w-full shrink-0 bg-cream/30 overflow-hidden border-b border-line flex items-center justify-center">
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
                      <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur-xs px-2.5 py-1 text-label font-sans uppercase tracking-label text-charcoal/80 rounded-sm border border-line shadow-card font-medium">
                        {storeName}
                      </span>

                      {/* Claimed Badge */}
                      {(status === "purchased" || status === "reported") && (
                        <div className="absolute top-3 right-3 bg-success text-cream px-2.5 py-1 text-label font-sans uppercase tracking-label rounded-sm shadow-card flex items-center gap-1 font-semibold">
                          <Check size={11} />
                          <span>{status === "purchased" ? "Purchased" : "Reported gifted"}</span>
                        </div>
                      )}
                      {status === "unavailable" && <span className="absolute top-3 right-3 bg-surface text-muted px-2.5 py-1 text-label rounded-sm border border-line">Out of stock</span>}
                    </div>

                    {/* Middle: Title, Description & Price */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-serif text-lg text-charcoal leading-snug group-hover:text-action transition-colors line-clamp-2 min-h-[2.75rem]">
                          {item.title}
                        </h4>
                        <p className="font-sans text-copy text-muted mt-1.5 line-clamp-2 min-h-[2.25rem] leading-relaxed">
                          {itemDescription}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs font-sans pt-3 mt-3 border-t border-sage/10">
                        <span className="font-sans tabular-nums font-semibold text-charcoal">
                          {item.price ? (item.price.startsWith("$") ? item.price : `$${item.price}`) : ""}
                        </span>
                        <span className="text-label uppercase tracking-label text-muted font-medium">
                          {item.category || ""}
                        </span>
                      </div>
                      {(item.quantity_requested ?? 1) > 1 && <p className="mt-2 text-caption text-muted">{item.quantity_purchased ?? 0} of {item.quantity_requested} purchased at the store{item.guest_reported_quantity ? ` · ${item.guest_reported_quantity} reported by guests` : ""}</p>}
                    </div>

                    {/* Bottom: Action Buttons */}
                    <div className="p-5 pt-0">
                      {isPurchased ? (
                        <div className="h-10 px-3 bg-success-soft border border-success-line rounded-sm flex items-center justify-between gap-2">
                          <span className="text-caption font-serif italic text-success truncate">
                            {status === "purchased" ? "Purchased — thank you!" : "Reported · awaiting confirmation"}
                          </span>
                          {itemLink && itemLink !== "#" && (
                            <a
                              href={itemLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-label uppercase tracking-label text-success hover:text-charcoal font-sans font-semibold transition-colors flex items-center gap-1"
                            >
                              <span>View</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={itemLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 basis-32 min-h-11 py-2 font-sans text-label uppercase tracking-normal bg-action text-cream px-3 rounded-sm hover:bg-action-hover transition-colors font-semibold text-center flex items-center justify-center gap-1.5 shadow-card group/btn whitespace-nowrap"
                          >
                            <span>{status === "unavailable" ? "Check Store" : item.registry_added ? "Shop Registry" : "View Gift"}</span>
                            <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 transition-transform shrink-0" />
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setClaimingItem(item);
                            }}
                            className="flex-1 basis-32 min-h-11 py-2 font-sans text-label uppercase tracking-normal bg-cream/30 hover:bg-cream/80 text-charcoal border border-line px-3 rounded-sm transition-colors font-semibold whitespace-nowrap cursor-pointer flex items-center justify-center"
                            title="Let us know you purchased this so others don't buy duplicate gifts"
                          >
                            I Bought This
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

        {itemsList.length > 0 && filteredItems.length === 0 && <p role="status" className="text-center text-muted">No gifts match these filters.</p>}
        </>}
        {/* SECTION B: Partner Stores (if configured) */}
        {storesList.length > 0 && (view === "stores" || (loaded && itemsList.length === 0)) && (
          <div className="pt-8 border-t border-line space-y-6">
            <div className="text-center space-y-1">
              <h3 className="font-serif text-2xl text-charcoal text-balance">Partner Store Registries</h3>
              <p className="font-sans text-copy text-muted">Browse our collections and check the latest gift availability at each store.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-stretch">
              {storesList.filter((store: any) => store.url).map((store: any) => (
                <a
                  key={store.name || store.url}
                  href={store.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-full bg-surface border border-line rounded-sm overflow-hidden hover:border-terracotta/50 hover:shadow-card transition-all flex flex-col group"
                >
                  {store.cover_photo && <img src={store.cover_photo} alt="Kelsey and Alexis at Griffith Observatory" className="w-full h-36 object-cover object-[65%_45%]" />}
                  <div className="p-5 flex flex-1 items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-cream/40 flex items-center justify-center text-charcoal/80 group-hover:text-action transition-colors">
                      <ShoppingBag size={18} />
                    </div>
                    <div>
                      <h4 className="font-serif text-base text-charcoal font-medium group-hover:text-action transition-colors">
                        {store.name}
                      </h4>
                      {store.guest_note && <p className="text-copy text-muted my-2 leading-relaxed">{store.guest_note}</p>}
                      <span className="text-label font-sans uppercase tracking-label text-muted">
                        View Complete Registry
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={14} className="shrink-0 text-muted group-hover:text-action group-hover:translate-x-0.5 transition-all" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer Alternative Link */}
        <div className="pt-8 border-t border-line text-center">
          <p className="text-copy font-sans text-charcoal/80">
            Prefer to contribute directly toward our honeymoon fund?{" "}
            <Link
              href="/registry/fund"
              className="font-semibold text-action hover:underline inline-flex items-center gap-1"
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
              onClick={closeClaim}
              className="fixed inset-0 bg-charcoal/80 backdrop-blur-md"
            />

            {/* Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-md bg-surface border border-line rounded-sm shadow-floating overflow-hidden z-10 p-6 md:p-7 space-y-5 my-auto"
              ref={dialogRef} tabIndex={-1} aria-label="Claim registry gift"
              role="dialog"
              aria-modal="true"
            >
              {claimSuccessMessage ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-success-soft text-success flex items-center justify-center">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="font-serif text-2xl text-charcoal">Thank you for your gift!</h4>
                  <p className="font-sans text-copy text-charcoal/80 max-w-xs mx-auto leading-relaxed">
                    {claimSuccessMessage}
                  </p>
                  <button onClick={closeClaim} className="px-5 py-3 bg-action text-cream rounded-sm">Done</button>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-success-soft text-success flex items-center justify-center shrink-0">
                        <Check size={16} />
                      </div>
                      <div>
                        <span className="font-sans text-label uppercase tracking-label text-success font-semibold block">Guest Self-Report</span>
                        <h4 className="font-serif text-lg text-charcoal">Report a Gift</h4>
                      </div>
                    </div>
                    <button
                      onClick={() => !isSubmittingClaim && setClaimingItem(null)}
                      aria-label="Close gift confirmation"
                      className="text-muted hover:text-charcoal p-2 cursor-pointer"
                      disabled={isSubmittingClaim}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4 text-copy font-sans text-charcoal/80">
                    <p className="leading-relaxed">
                      Thank you so much! Did you purchase <strong className="font-serif text-lg text-charcoal font-semibold">{claimingItem.title}</strong>?
                    </p>
                    <p className="text-muted leading-relaxed">
                      Only confirm after buying your gift. This records your report on our website; the couple will reconcile it with the store registry. It does not place an order or mark anything purchased at the store.
                    </p>

                    <div>
                      <label className="block text-label uppercase tracking-label text-muted mb-1.5 font-semibold">
                        Your Name (Optional — so the couple can thank you!):
                      </label>
                      <input
                        type="text"
                        aria-label="Your name for the gift"
                        maxLength={200}
                        value={claimName}
                        onChange={(e) => setClaimName(e.target.value)}
                        placeholder="e.g. Grandma Helen or The Fortini Family"
                        className="w-full border border-line p-2.5 bg-cream/20 text-base outline-none focus:border-action rounded-sm"
                        disabled={isSubmittingClaim}
                      />
                    </div>
                  </div>

                  {claimError && <p role="alert" className="font-sans text-copy text-danger">{claimError}</p>}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleConfirmClaim}
                      disabled={isSubmittingClaim}
                      className="flex-1 font-sans text-label uppercase tracking-normal bg-action hover:bg-action-hover text-cream py-3 px-4 rounded-sm transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer shadow-card disabled:opacity-50"
                    >
                      {isSubmittingClaim ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check size={13} />
                          <span>Confirm I Bought This</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setClaimingItem(null)}
                      disabled={isSubmittingClaim}
                      className="font-sans text-label uppercase tracking-label text-muted hover:text-charcoal py-3 px-4 border border-line hover:bg-cream/40 rounded-sm transition-colors cursor-pointer"
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
