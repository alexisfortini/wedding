"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { mockDatabase } from '@/lib/mockDatabase';
import BackgroundPhoto from "./BackgroundPhoto";
import imagesConfigDefault from "@config/ui/images.json";

export default function GalleryTeaser() {
  const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);

  useEffect(() => {
    mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
  }, []);

  return (
    <section 
      className="relative py-24 md:py-36 text-cream px-6 overflow-hidden"
      style={{ clipPath: "inset(0px)" }}
    >
      <BackgroundPhoto config={imagesConfig} slot="gallery_teaser" fallback="/photos/engagement/K%26A%20Engagement%20highlights-1.jpg" />
      {/* Light dark overlay to ensure readability */}
      <div className="absolute inset-0 bg-charcoal/40 pointer-events-none"></div>

      <div className="relative max-w-4xl mx-auto z-10 text-center flex flex-col items-center">
        <span className="font-sans text-label uppercase tracking-label text-cream/90 block mb-3 font-semibold">Gallery</span>
        <h2 className="text-4xl md:text-5xl font-serif text-cream mb-4 tracking-normal text-balance">Captured Moments</h2>
        <p className="text-cream/90 font-serif italic text-lg max-w-md mx-auto mb-8 leading-relaxed">
          Our favorite moments captured high above the city skyline.
        </p>
        <Link 
          href="/gallery" 
          className="inline-block bg-action text-cream px-8 py-3.5 rounded-sm hover:bg-action-hover transition-colors duration-500 font-sans text-label uppercase tracking-label font-medium shadow-card"
        >
          View Full Gallery
        </Link>
      </div>
    </section>
  );
}
