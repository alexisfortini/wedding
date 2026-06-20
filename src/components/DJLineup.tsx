"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { mockDatabase } from '@/lib/mockDatabase';
import { getResponsiveImageStyle } from '@/lib/imageHelper';
import djConfigDefault from "@config/ui/dj_lineup.json";
import imagesConfigDefault from "@config/ui/images.json";

export default function DJLineup() {
  const [config, setConfig] = useState(djConfigDefault);
  const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);

  useEffect(() => {
    mockDatabase.getSiteConfig("dj_lineup", djConfigDefault).then(setConfig);
    mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
  }, []);

  const events = config.events;

  return (
    <section 
      className="relative py-28 text-cream px-6 overflow-hidden"
      style={{ clipPath: "inset(0px)" }}
    >
      <div 
        className="responsive-bg-image fixed inset-0 bg-cover pointer-events-none bg-center"
        style={getResponsiveImageStyle(imagesConfig, "dj_lineup", "/photos/engagement/K%26A%20Engagement%20highlights-5.jpg")}
      />
      {/* Editorial warm overlay for desert sunset vibe */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/60 to-charcoal/85 pointer-events-none"></div>

      <div className="relative max-w-5xl mx-auto z-10">
        <div className="text-center mb-16">
           <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-terracotta block mb-3 font-medium">Soundtrack</span>
           <h2 className="text-4xl md:text-5xl font-serif text-cream mb-4">{config.title}</h2>
           <p className="text-cream/70 font-serif italic text-base max-w-md mx-auto">
             {config.subtitle}
           </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 md:gap-6">
          {events.map((event, idx) => (
            <div 
              key={event.name}
              className="flex flex-col items-center text-center p-8 bg-cream/5 backdrop-blur-[2px] border border-cream/10 rounded-sm hover:border-terracotta/35 transition-all duration-500 group"
            >
              <h3 className="font-serif text-2xl mb-6 text-cream tracking-wide font-light">{event.name}</h3>
              
              <div className="w-full space-y-4">
                {event.lineup.map((set, i) => (
                  <div key={i} className="flex justify-between items-center w-full max-w-[240px] mx-auto border-b border-cream/10 pb-2 group-hover:border-cream/20 transition-colors">
                    <span className="font-sans text-[9px] uppercase tracking-[0.15em] text-cream/50">{set.time}</span>
                    <span className="font-serif text-sm tracking-wider text-cream group-hover:text-terracotta transition-colors">{set.dj}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
