"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { mockDatabase } from "@/lib/mockDatabase";
import { getResponsiveImageStyle } from "@/lib/imageHelper";
import generalConfigDefault from "@config/ui/general.json";
import imagesConfigDefault from "@config/ui/images.json";

export default function HeroSection() {
    const [config, setConfig] = useState(generalConfigDefault);
    const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);

    useEffect(() => {
        mockDatabase.getSiteConfig("general", generalConfigDefault).then(setConfig);
        mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
    }, []);

    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    return (
        <section ref={ref} className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-cream px-6" style={{ clipPath: "inset(0px)" }}>
            <div 
                style={{ 
                  ...getResponsiveImageStyle(imagesConfig, "hero", "/photos/engagement/K%26A%20Engagement%20highlights-2.jpg")
                }} 
                className="responsive-bg-image fixed inset-0 w-full h-full bg-cover pointer-events-none"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-charcoal/25 via-charcoal/40 to-charcoal/65"></div>
            </div>

            <motion.div
                style={{ y: textY, opacity }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                className="text-center flex flex-col items-center justify-center max-w-4xl mx-auto z-10"
            >
                <div className="space-y-6">
                    <span className="text-xs md:text-sm tracking-[0.3em] text-cream uppercase font-sans font-semibold">
                        {config.invite_message}
                    </span>
                    <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl text-cream font-serif leading-none tracking-tight">
                        {config.partner1} <span className="text-terracotta italic font-light">&</span> {config.partner2}
                    </h1>
                </div>

                <div className="flex items-center justify-center gap-6 mt-12 mb-16">
                    <div className="w-12 h-[1px] bg-cream/35"></div>
                    <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-xs md:text-sm font-sans tracking-[0.2em] text-cream uppercase items-center font-medium">
                        <span>{config.date}</span>
                        <span className="hidden md:inline text-cream/40">•</span>
                        <span>{config.location_name}</span>
                    </div>
                    <div className="w-12 h-[1px] bg-cream/35"></div>
                </div>

                <motion.a
                    href="#rsvp"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-block px-10 py-4 border border-cream/35 text-cream uppercase tracking-[0.2em] text-xs font-sans hover:bg-terracotta hover:text-cream hover:border-terracotta transition-all duration-500 rounded-sm font-semibold shadow-sm"
                >
                    {config.rsvp_prompt}
                </motion.a>
            </motion.div>
        </section>
    );
}
