"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { mockDatabase } from '@/lib/mockDatabase';
import BackgroundPhoto from "./BackgroundPhoto";
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
      className="relative py-16 md:py-24 text-cream px-6 overflow-hidden"
      style={{ clipPath: "inset(0px)" }}
    >
      <BackgroundPhoto config={imagesConfig} slot="dj_lineup" fallback="/photos/engagement/K%26A%20Engagement%20highlights-5.jpg" />
      {/* Editorial warm overlay for desert sunset vibe */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/60 to-charcoal/85 pointer-events-none"></div>

      <div className="relative max-w-5xl mx-auto z-10">
        <div className="text-center mb-10 md:mb-12">
           <span className="font-sans text-label uppercase tracking-label text-cream/90 block mb-3 font-medium">Soundtrack</span>
           <h2 className="text-4xl md:text-5xl font-serif text-cream mb-4 text-balance">{config.title}</h2>
           <p className="text-cream/90 font-serif italic text-lg max-w-md mx-auto leading-relaxed">
             {config.subtitle}
           </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 md:gap-6">
          {events.map((event, idx) => (
            <div 
              key={event.name}
              className="flex flex-col items-center text-center p-8 bg-cream/5 border border-cream/10 rounded-sm"
            >
              <h3 className="font-serif text-2xl mb-6 text-cream tracking-normal font-light text-balance">{event.name}</h3>
              
              <div className="w-full space-y-4">
                {event.lineup.map((set, i) => (
                  <div key={i} className="flex justify-between items-center w-full max-w-[240px] mx-auto border-b border-cream/10 last:border-b-0 pb-2">
                    <span className="font-sans text-label uppercase tracking-label text-cream/90">{set.time}</span>
                    <span className="font-serif text-lg tracking-normal text-cream">{set.dj}</span>
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
