"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { mockDatabase } from '@/lib/mockDatabase';
import { getResponsiveImageStyle } from '@/lib/imageHelper';
import imagesConfigDefault from "@config/ui/images.json";

export default function GalleryTeaser() {
  const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);

  useEffect(() => {
    mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
  }, []);

  return (
    <section 
      className="relative py-48 text-cream px-6 overflow-hidden"
      style={{ clipPath: "inset(0px)" }}
    >
      <div 
        className="responsive-bg-image fixed inset-0 bg-cover pointer-events-none bg-center"
        style={getResponsiveImageStyle(imagesConfig, "gallery_teaser", "/photos/engagement/K%26A%20Engagement%20highlights-1.jpg")}
      />
      {/* Light dark overlay to ensure readability */}
      <div className="absolute inset-0 bg-charcoal/40 pointer-events-none"></div>

      <div className="relative max-w-4xl mx-auto z-10 text-center flex flex-col items-center">
        <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-terracotta block mb-3 font-semibold">Gallery</span>
        <h2 className="text-4xl md:text-5xl font-serif text-cream mb-4 tracking-wide">Captured Moments</h2>
        <p className="text-cream/90 font-serif italic text-base max-w-md mx-auto mb-8">
          Our favorite moments captured high above the city skyline.
        </p>
        <Link 
          href="/gallery" 
          className="inline-block bg-terracotta text-cream px-8 py-3.5 rounded-sm hover:bg-cream hover:text-charcoal transition-colors duration-500 font-sans text-[10px] uppercase tracking-[0.2em] font-medium shadow-sm"
        >
          View Full Gallery
        </Link>
      </div>
    </section>
  );
}
