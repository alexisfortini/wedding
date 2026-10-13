"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react";
import { useDialog } from "@/lib/useDialog";

export default function GalleryGrid({ photos }: { photos: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [highResLoaded, setHighResLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [galleryConfig, setGalleryConfig] = useState<{ hidden_photos: string[] }>({ hidden_photos: [] });
  const dialogRef = useDialog(selectedIndex !== null, () => setSelectedIndex(null));

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetch("/api/get-site-config?key=gallery", { signal: AbortSignal.timeout(15000), cache: "no-store" })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error("Gallery unavailable");
        if (!cancelled) { setGalleryConfig(data.value ?? { hidden_photos: [] }); setReady(true); }
      })
      .catch(() => { if (!cancelled) setError("We couldn't load the gallery. Please try again."); });
    try {
      const guest = JSON.parse(localStorage.getItem("wedding_guest") || "null");
      if (guest) fetch("/api/get-site-config?key=admin")
        .then(res => res.json()).then(data => {
          if (!cancelled) setIsAdmin(Boolean(data.value?.admins?.some((admin: any) =>
            admin.first.toLowerCase().trim() === guest.first_name?.toLowerCase().trim() &&
            admin.last.toLowerCase().trim() === guest.last_name?.toLowerCase().trim())));
        }).catch(() => {});
    } catch { /* Invalid saved identifiers do not affect the gallery. */ }
    return () => { cancelled = true; };
  }, [retry]);

  const hiddenSet = new Set(galleryConfig.hidden_photos || []);
  const displayPhotos = isEditing ? photos : photos.filter(src => !hiddenSet.has(src));
  const navigate = (direction: number) => {
    setHighResLoaded(false);
    setImageError(false);
    setSelectedIndex(index => index === null || !displayPhotos.length ? null : (index + direction + displayPhotos.length) % displayPhotos.length);
  };

  useEffect(() => {
    if (selectedIndex === null) return;
    if (selectedIndex >= displayPhotos.length) { setSelectedIndex(null); return; }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); navigate(event.key === "ArrowLeft" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIndex, displayPhotos.length]);

  const togglePhotoVisibility = async (src: string) => {
    if (saving) return;
    setSaving(true); setError("");
    const hidden = galleryConfig.hidden_photos || [];
    const next = { ...galleryConfig, hidden_photos: hidden.includes(src) ? hidden.filter(photo => photo !== src) : [...hidden, src] };
    try {
      const res = await fetch("/api/save-site-config", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-passcode": sessionStorage.getItem("wedding_admin_passcode") || "" },
        body: JSON.stringify({ key: "gallery", value: next }), signal: AbortSignal.timeout(15000),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Could not save photo visibility.");
      setGalleryConfig(next);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save photo visibility. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-8">
      {error && <div role="alert" className="p-4 border border-danger-line bg-danger-soft text-danger font-sans text-copy">
        {error} {!ready && <button onClick={() => setRetry(value => value + 1)} className="ml-3 underline">Retry gallery</button>}
      </div>}
      {!ready && !error && <p role="status" className="text-center font-sans text-copy text-muted">Loading photographs…</p>}
      {isAdmin && <div className="flex justify-end">
        <button disabled={saving} onClick={() => setIsEditing(value => !value)} aria-pressed={isEditing}
          className="px-5 py-3 border border-line text-charcoal font-sans text-label uppercase tracking-label rounded-sm flex items-center gap-2 disabled:opacity-50">
          {isEditing ? <EyeOff size={16} /> : <Eye size={16} />}{isEditing ? "Finish editing" : "Edit gallery"}
        </button>
      </div>}
      {ready && <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
        {displayPhotos.map((src, index) => <div key={src} className={`aspect-[4/5] relative overflow-hidden rounded-sm bg-surface-muted ${hiddenSet.has(src) ? "opacity-60" : ""}`}>
          <Image src={src} alt={`Alexis and Kelsey's engagement photograph ${index + 1}`} fill
            sizes="(min-width: 1280px) 405px, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
            loading={index < 3 ? "eager" : "lazy"} className="object-cover" />
          {isEditing ? <button disabled={saving} onClick={() => togglePhotoVisibility(src)}
            aria-label={`${hiddenSet.has(src) ? "Show" : "Hide"} photograph ${index + 1}`}
            className="absolute top-3 right-3 p-3 bg-surface text-charcoal rounded-sm border border-line disabled:opacity-50">
            {hiddenSet.has(src) ? <EyeOff size={18} /> : <Eye size={18} />}
          </button> : <button onClick={() => { setHighResLoaded(false); setImageError(false); setSelectedIndex(index); }}
            aria-label={`Open photograph ${index + 1} of ${displayPhotos.length}`} aria-haspopup="dialog"
            className="absolute inset-0 cursor-zoom-in hover:bg-charcoal/10 focus-visible:bg-charcoal/10 focus-visible:outline-offset-[-4px] transition-colors" />}
        </div>)}
      </div>}
      {ready && !displayPhotos.length && <p className="text-center font-serif text-xl text-olive">More photographs are coming soon.</p>}
      {selectedIndex !== null && displayPhotos[selectedIndex] && <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Engagement photographs" tabIndex={-1}
        className="fixed inset-0 z-[1000] bg-charcoal/95 flex flex-col items-center p-4 sm:p-6">
        <div className="w-full max-w-7xl flex justify-between items-center text-cream text-caption font-sans shrink-0">
          <span aria-live="polite">Photo {selectedIndex + 1} of {displayPhotos.length}</span>
          <button onClick={() => setSelectedIndex(null)} className="p-3 hover:bg-cream/10 rounded-sm" aria-label="Close photographs"><X size={22} /></button>
        </div>
        <div className="relative flex-1 min-h-0 w-full max-w-6xl my-4">
          {!highResLoaded && !imageError && <div role="status" className="absolute inset-0 flex items-center justify-center text-cream gap-2"><Loader2 className="animate-spin" size={22} /><span>Loading photograph…</span></div>}
          {imageError ? <p role="alert" className="absolute inset-0 flex items-center justify-center text-cream text-center">This photograph couldn't load. Please try another photograph or reopen it.</p> : <Image key={displayPhotos[selectedIndex]} src={displayPhotos[selectedIndex]} alt={`Engagement photograph ${selectedIndex + 1}`} fill sizes="100vw" loading="eager"
            onLoad={() => setHighResLoaded(true)} onError={() => setImageError(true)} className={`object-contain transition-opacity ${highResLoaded ? "opacity-100" : "opacity-0"}`} />}
          <button onClick={() => navigate(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 p-3 text-cream bg-charcoal/70 rounded-sm" aria-label="Previous photograph"><ChevronLeft /></button>
          <button onClick={() => navigate(1)} className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-cream bg-charcoal/70 rounded-sm" aria-label="Next photograph"><ChevronRight /></button>
        </div>
        <p className="text-cream/80 text-caption font-sans shrink-0">Use the arrows to browse. Escape closes the photograph.</p>
      </div>}
    </div>
  );
}
