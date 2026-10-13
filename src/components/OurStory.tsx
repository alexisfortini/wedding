/* eslint-disable */
"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { mockDatabase } from '@/lib/mockDatabase';
import { getResponsiveImgStyle } from '@/lib/imageHelper';
import storyConfigDefault from "@config/ui/story.json";
import imagesConfigDefault from "@config/ui/images.json";

export default function OurStory() {
  const [config, setConfig] = useState(storyConfigDefault);
  const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);

  useEffect(() => {
    mockDatabase.getSiteConfig("story", storyConfigDefault).then(setConfig);
    mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
  }, []);

  const storyItems = config.timeline;

  return (
    <section 
      id="our-story" 
      className="relative py-16 md:py-24 px-6 md:px-12 bg-cream overflow-hidden"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        
        {/* Image Column */}
        <div className="relative w-full max-w-lg lg:max-w-none aspect-[4/3] lg:aspect-[3/4] mx-auto">
           <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="w-full h-full relative"
           >
             <div className="w-full h-full relative overflow-hidden rounded-sm">
               <Image 
                 src={imagesConfig.story || "/photos/engagement/K%26A%20Engagement%20highlights-3.jpg"} 
                 alt="Alexis and Kelsey" 
                 fill
                 sizes="(min-width: 1024px) 544px, (min-width: 640px) 512px, calc(100vw - 48px)"
                 style={getResponsiveImgStyle(imagesConfig, "story")}
                 className="responsive-img-style object-cover"
               />
             </div>
             <div className="absolute inset-0 ring-1 ring-inset ring-charcoal/5 pointer-events-none rounded-sm"></div>
           </motion.div>
        </div>

        {/* Text/Timeline Column */}
        <div className="relative w-full max-w-xl lg:max-w-none mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-8 md:mb-10"
          >
            <p className="text-label tracking-label text-action uppercase font-sans mb-3">
              {config.subtitle}
            </p>
            <h2 className="text-4xl md:text-5xl font-serif text-charcoal leading-tight text-balance">
              {config.title}
            </h2>
          </motion.div>

          <div className="relative border-l border-sage/30 pl-8 space-y-8 md:space-y-12">
            {storyItems.map((item, index) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Dot */}
                <div className="absolute left-[-37px] top-1.5 w-2 h-2 rounded-full bg-terracotta ring-4 ring-cream"></div>

                <span className="font-sans text-xs uppercase tracking-label text-olive block mb-2">{item.year}</span>
                <h3 className="text-2xl font-serif text-charcoal mb-3 text-balance">{item.title}</h3>
                <p className="font-sans text-charcoal/80 leading-7 max-w-md">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
