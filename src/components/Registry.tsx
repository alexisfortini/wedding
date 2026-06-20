"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Gift } from "lucide-react";
import { mockDatabase } from "@/lib/mockDatabase";
import { getResponsiveImageStyle } from "@/lib/imageHelper";
import registryConfigDefault from "@config/ui/registry.json";
import imagesConfigDefault from "@config/ui/images.json";

const iconMap: Record<string, React.ComponentType<any>> = {
    Heart,
    Gift
};

export default function Registry() {
    const [config, setConfig] = useState(registryConfigDefault);
    const [imagesConfig, setImagesConfig] = useState(imagesConfigDefault);

    useEffect(() => {
        mockDatabase.getSiteConfig("registry", registryConfigDefault).then(setConfig);
        mockDatabase.getSiteConfig("images", imagesConfigDefault).then(setImagesConfig);
    }, []);

    return (
        <section 
          id="registry" 
          className="relative py-28 px-6 overflow-hidden"
          style={{ clipPath: "inset(0px)" }}
        >
            <div 
              className="responsive-bg-image fixed inset-0 bg-cover pointer-events-none bg-center"
              style={getResponsiveImageStyle(imagesConfig, "registry", "/photos/engagement/K%26A%20Engagement%20highlights-6.jpg")}
            />
            <div className="absolute inset-0 bg-charcoal/60 pointer-events-none"></div>

            <div className="relative max-w-4xl mx-auto z-10">
                 <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-terracotta block mb-3 font-medium">Gifts</span>
                    <h2 className="text-4xl md:text-5xl font-serif text-cream mb-4">
                        {config.title}
                    </h2>
                    <p className="text-cream/90 font-serif italic text-base max-w-md mx-auto">
                        {config.description}
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8">
                    {config.funds.map((fund, index) => {
                        const IconComponent = iconMap[fund.icon] || Gift;
                        const isHeart = fund.icon === "Heart";
                        return (
                            <motion.div
                                key={fund.title}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: (index + 1) * 0.1 }}
                                viewport={{ once: true }}
                                className="p-10 border border-cream/20 bg-charcoal/40 backdrop-blur-md rounded-sm text-center relative overflow-hidden group hover:border-terracotta/50 transition-all duration-500"
                            >
                                <div className="relative z-10">
                                    <div className="w-12 h-12 mx-auto rounded-full bg-cream/10 border border-cream/20 flex items-center justify-center text-terracotta mb-6 group-hover:scale-105 transition-transform duration-300">
                                        <IconComponent 
                                            size={20} 
                                            strokeWidth={1.5} 
                                            {...(isHeart ? { fill: "currentColor", className: "opacity-30 text-terracotta" } : {})}
                                        />
                                    </div>
                                    <h3 className="text-2xl font-serif text-cream mb-3 tracking-wide">{fund.title}</h3>
                                    <p className="font-sans text-sm text-cream/70 tracking-wide mb-6 leading-relaxed">
                                        {fund.description}
                                    </p>
                                    <a 
                                        href={fund.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block font-sans text-[10px] uppercase tracking-[0.2em] bg-terracotta text-cream px-8 py-3.5 rounded-sm hover:bg-cream hover:text-charcoal transition-colors font-medium shadow-sm"
                                    >
                                        {fund.button_text}
                                    </a>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
