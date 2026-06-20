"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

interface GalleryGridProps {
  photos: string[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03
    }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.4, 
      ease: "easeOut" 
    } 
  }
} as const;

export default function GalleryGrid({ photos }: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [highResLoaded, setHighResLoaded] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [maxVisibleIndex, setMaxVisibleIndex] = useState<number>(-1);
  const [hasFinishedCascade, setHasFinishedCascade] = useState(false);

  // Fallback timeout to ensure all images eventually show if cascade gets stuck or is slow
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasFinishedCascade(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Admin and configuration state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [galleryConfig, setGalleryConfig] = useState<{ hidden_photos: string[] }>({ hidden_photos: [] });


  // Fetch configs and check admin status
  useEffect(() => {
    // 1. Fetch gallery configuration
    fetch("/api/get-site-config?key=gallery")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.value) {
          setGalleryConfig(data.value);
        }
      })
      .catch(err => console.error("Error loading gallery config:", err));

    // 2. Check admin status based on local storage login
    const savedGuestStr = localStorage.getItem("wedding_guest");
    if (savedGuestStr) {
      try {
        const guest = JSON.parse(savedGuestStr);
        fetch("/api/get-site-config?key=admin")
          .then(res => res.json())
          .then(data => {
            if (data.success && data.value) {
              const adminConfig = data.value;
              const isUserAdmin = guest && adminConfig.admins.some(
                (a: any) => a.first === guest.first_name.toLowerCase().trim() &&
                            a.last === guest.last_name.toLowerCase().trim()
              );
              setIsAdmin(!!isUserAdmin);
            }
          })
          .catch(err => console.error("Error loading admin config:", err));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Filter display photos list based on active visibility configurations
  const hiddenSet = new Set(galleryConfig.hidden_photos || []);
  const visiblePhotos = photos.filter(p => !hiddenSet.has(p));
  const displayPhotos = isEditing ? photos : visiblePhotos;

  // Cascade loaded images in order
  useEffect(() => {
    if (hasFinishedCascade) return;

    if (maxVisibleIndex >= displayPhotos.length - 1 && displayPhotos.length > 0) {
      setHasFinishedCascade(true);
      return;
    }

    const nextIndex = maxVisibleIndex + 1;
    if (nextIndex < displayPhotos.length && loadedImages[nextIndex]) {
      const timer = setTimeout(() => {
        setMaxVisibleIndex(nextIndex);
      }, 35);
      return () => clearTimeout(timer);
    }
  }, [loadedImages, maxVisibleIndex, displayPhotos.length, hasFinishedCascade]);


  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        navigateLeft();
      } else if (e.key === "ArrowRight") {
        navigateRight();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [selectedIndex, displayPhotos.length]);

  const openLightbox = (index: number) => {
    setHighResLoaded(false);
    setSelectedIndex(index);
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
  };

  const navigateLeft = () => {
    if (selectedIndex === null) return;
    setHighResLoaded(false);
    setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : displayPhotos.length - 1));
  };

  const navigateRight = () => {
    if (selectedIndex === null) return;
    setHighResLoaded(false);
    setSelectedIndex((prev) => (prev !== null && prev < displayPhotos.length - 1 ? prev + 1 : 0));
  };

  const togglePhotoVisibility = async (src: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentHidden = galleryConfig.hidden_photos || [];
    let newHidden: string[];
    
    if (currentHidden.includes(src)) {
      newHidden = currentHidden.filter(p => p !== src);
    } else {
      newHidden = [...currentHidden, src];
    }
    
    const newConfig = { hidden_photos: newHidden };
    setGalleryConfig(newConfig);

    try {
      const currentPasscode = typeof window !== "undefined" ? sessionStorage.getItem("wedding_admin_passcode") || "" : "";
      await fetch("/api/save-site-config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-passcode": currentPasscode
        },
        body: JSON.stringify({
          key: "gallery",
          value: newConfig
        })
      });
    } catch (err) {
      console.error("Failed to save gallery visibility configuration:", err);
    }
  };

  return (
    <div className="space-y-12">
      {/* Admin Panel Header */}
      {isAdmin && (
        <div className="flex justify-end border-b border-sage/15 pb-6">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-6 py-3 font-sans text-xs uppercase tracking-[0.2em] rounded-sm shadow-sm transition-all duration-300 font-semibold flex items-center gap-2 cursor-pointer ${
              isEditing
                ? "bg-terracotta text-cream hover:bg-olive"
                : "bg-charcoal text-cream hover:bg-terracotta"
            }`}
          >
            {isEditing ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{isEditing ? "Exit Edit Mode" : "Edit Gallery (Admin)"}</span>
          </button>
        </div>
      )}

      {/* Photo Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8"
      >
        {displayPhotos.map((src, idx) => {
          const isHidden = hiddenSet.has(src);
          return (
            <motion.div
              key={src}
              variants={itemVariants}
              initial="hidden"
              animate={hasFinishedCascade || idx <= maxVisibleIndex ? "show" : "hidden"}
              onClick={() => !isEditing && openLightbox(idx)}
              className={`w-full aspect-[4/5] relative overflow-hidden rounded-sm shadow-sm group border cursor-pointer transition-all duration-300 ${
                isEditing 
                  ? isHidden 
                    ? "border-red-400/35 bg-red-950/5 opacity-60" 
                    : "border-sage/40 bg-cream/10 hover:border-terracotta"
                  : "bg-sage/5 border-sage/10"
              }`}
            >
              <Image
                src={src}
                alt={`Engagement photo ${idx + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={idx < 6}
                loading={idx < 6 ? undefined : "lazy"}
                onLoad={() => setLoadedImages(prev => ({ ...prev, [idx]: true }))}
                className="object-cover object-center group-hover:scale-[1.03] transition-all duration-700 ease-out"
              />
              
              {/* Edit Mode Controls */}
              {isEditing && (
                <button
                  onClick={(e) => togglePhotoVisibility(src, e)}
                  className={`absolute top-3 right-3 z-30 p-2.5 rounded-full backdrop-blur-md border shadow-md transition-all duration-300 hover:scale-105 cursor-pointer ${
                    isHidden
                      ? "bg-red-500/95 text-white border-red-400 hover:bg-red-600"
                      : "bg-white/95 text-charcoal/70 border-sage/20 hover:bg-white hover:text-terracotta"
                  }`}
                  title={isHidden ? "Show photo in gallery" : "Hide photo from gallery"}
                >
                  {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              )}

              {/* Hidden Status Overlay Badge */}
              {isEditing && isHidden && (
                <div className="absolute inset-0 bg-red-950/20 pointer-events-none flex items-center justify-center z-20">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-red-500 font-sans font-bold bg-white/95 border border-red-300/40 px-3 py-1.5 rounded-sm shadow-md">
                    Hidden
                  </span>
                </div>
              )}
              
              {/* Regular Hover Overlay */}
              {!isEditing && (
                <div className="absolute inset-0 bg-charcoal/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white font-sans bg-charcoal/40 backdrop-blur-sm px-4 py-2 rounded-sm border border-white/10 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 font-semibold">
                    View Fullscreen
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-[1000] bg-charcoal/95 backdrop-blur-md flex flex-col justify-between items-center py-6 px-4 select-none">
          {/* Header Controls */}
          <div className="w-full max-w-7xl flex justify-between items-center text-cream/70 text-xs font-sans px-4 z-50">
            <span className="tracking-wider uppercase font-semibold">
              Photo {selectedIndex + 1} of {displayPhotos.length}
            </span>
            <button
              onClick={closeLightbox}
              className="p-2 text-cream/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              aria-label="Close Lightbox"
            >
              <X size={20} />
            </button>
          </div>

          {/* Main Content Area */}
          <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center py-4">
            {/* Loading Indicator */}
            {!highResLoaded && (
              <div className="absolute flex flex-col items-center justify-center text-cream/50 gap-2 font-sans text-xs">
                <Loader2 className="animate-spin text-sage" size={24} />
                <span>Loading High-Resolution...</span>
              </div>
            )}

            {/* High-res Image */}
            <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center">
              <img
                src={displayPhotos[selectedIndex]}
                alt={`Engagement photo fullscreen ${selectedIndex + 1}`}
                onLoad={() => setHighResLoaded(true)}
                className={`max-w-full max-h-full object-contain rounded-sm shadow-2xl transition-all duration-500 ${
                  highResLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                }`}
              />
            </div>

            {/* Left/Right Controls on overlay */}
            <button
              onClick={navigateLeft}
              className="absolute left-2 md:left-6 p-2 md:p-3 text-cream/70 hover:text-white bg-charcoal/30 hover:bg-white/10 rounded-full transition-all cursor-pointer backdrop-blur-xs select-none"
              aria-label="Previous Photo"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={navigateRight}
              className="absolute right-2 md:right-6 p-2 md:p-3 text-cream/70 hover:text-white bg-charcoal/30 hover:bg-white/10 rounded-full transition-all cursor-pointer backdrop-blur-xs select-none"
              aria-label="Next Photo"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Footer Controls for Mobile Tap assistance */}
          <div className="w-full max-w-xs flex justify-center gap-6 z-50 py-2">
            <button
              onClick={navigateLeft}
              className="flex items-center gap-1 px-4 py-2 text-xs uppercase tracking-wider text-cream/60 hover:text-white border border-cream/20 hover:border-white rounded-sm transition-all cursor-pointer"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              onClick={navigateRight}
              className="flex items-center gap-1 px-4 py-2 text-xs uppercase tracking-wider text-cream/60 hover:text-white border border-cream/20 hover:border-white rounded-sm transition-all cursor-pointer"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
