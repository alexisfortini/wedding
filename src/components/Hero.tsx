"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { mockDatabase } from "@/lib/mockDatabase";
import BackgroundPhoto from "./BackgroundPhoto";
import { scrollToSection } from "@/lib/scrollToSection";
import generalConfigDefault from "@config/ui/general.json";
import imagesConfigDefault from "@config/ui/images.json";

export default function HeroSection() {
    const [config, setConfig] = useState(generalConfigDefault);
    const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);

    useEffect(() => {
        mockDatabase.getSiteConfig("general", generalConfigDefault).then(setConfig);
        mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
    }, []);

    const reduceMotion = useReducedMotion();
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    return (
        <section ref={ref} className="relative w-full min-h-svh py-28 md:py-32 flex items-center justify-center overflow-hidden bg-cream px-6" style={{ clipPath: "inset(0px)" }}>
            <BackgroundPhoto config={imagesConfig} slot="hero" fallback="/photos/engagement/K%26A%20Engagement%20highlights-2.jpg" eager>
                <div className="absolute inset-0 bg-gradient-to-b from-charcoal/25 via-charcoal/40 to-charcoal/65"></div>
            </BackgroundPhoto>

            <motion.div
                style={reduceMotion ? undefined : { y: textY, opacity }}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                className="text-center flex flex-col items-center justify-center max-w-4xl mx-auto z-10"
            >
                <div className="space-y-6">
                    <span className="text-label md:text-sm tracking-label text-cream uppercase font-sans font-semibold">
                        {config.invite_message}
                    </span>
                    <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl text-cream font-serif leading-none tracking-tight text-balance">
                        {config.partner1} <span className="text-terracotta italic font-light">&</span> {config.partner2}
                    </h1>
                </div>

                <div className="flex items-center justify-center gap-3 sm:gap-6 mt-12 mb-16 w-full">
                    <div className="w-6 sm:w-12 shrink-0 h-[1px] bg-cream/35"></div>
                    <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-caption md:text-sm font-sans tracking-label text-cream uppercase items-center font-medium">
                        <span>{config.date}</span>
                        <span className="hidden md:inline text-cream/40">•</span>
                        <span>{config.location_name}</span>
                    </div>
                    <div className="w-6 sm:w-12 shrink-0 h-[1px] bg-cream/35"></div>
                </div>

                <motion.button
                    onClick={(e) => {
                        e.preventDefault();
                        scrollToSection("rsvp");
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-block px-10 py-4 border border-cream/35 text-cream uppercase tracking-label text-xs font-sans hover:bg-action hover:text-cream hover:border-action transition-all duration-500 rounded-sm font-semibold shadow-card cursor-pointer"
                >
                    {config.rsvp_prompt}
                </motion.button>
            </motion.div>
        </section>
    );
}
