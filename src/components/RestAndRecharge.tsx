"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plane, Hotel, Coffee, MapPin } from "lucide-react";
import dynamic from 'next/dynamic';
import { mockDatabase } from "@/lib/mockDatabase";
import travelConfigDefault from "@config/ui/travel.json";

const MapSection = dynamic(() => import("./MapSection"), { ssr: false });

const iconMap = { Plane, Hotel, Coffee, MapPin };

const InfoCard = ({ title, icon: Icon, children }: any) => (
    <div
        className="w-full h-full p-8 border border-olive/15 bg-cream/50 backdrop-blur-[2px] rounded-sm hover:border-terracotta/30 transition-all duration-500 flex flex-col items-center text-center space-y-4"
    >
        <div className="w-10 h-10 rounded-full border border-olive/20 flex items-center justify-center text-terracotta mb-2 bg-cream">
            <Icon size={18} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-serif text-charcoal tracking-wide">{title}</h3>
        <div className="font-sans text-xs sm:text-sm text-charcoal/70 leading-relaxed space-y-2">
            {children}
        </div>
    </div>
);

export default function RestAndRecharge() {
    const [config, setConfig] = useState(travelConfigDefault);

    useEffect(() => {
        mockDatabase.getSiteConfig("travel", travelConfigDefault).then(setConfig);
    }, []);

    return (
        <section id="travel" className="py-16 bg-cream px-6 border-t border-olive/10">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center">
                    <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-terracotta block mb-3 font-medium">Logistics</span>
                    <h2 className="text-4xl md:text-5xl font-serif text-charcoal mb-4">
                        {config.title}
                    </h2>
                    <p className="text-olive font-serif italic text-base max-w-md mx-auto">
                        {config.description}
                    </p>
                </div>

                {/* Airports Row */}
                <div>
                    <h3 className="text-olive text-center mb-8 uppercase tracking-widest text-xs font-semibold">Airports</h3>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {config.airports.map((airport: any, idx: number) => (
                            <div key={airport.title} className="flex">
                                <InfoCard title={airport.title} icon={Plane}>
                                    <p>{airport.description}</p>
                                    {airport.tag && (
                                        <p className="text-[10px] uppercase tracking-widest text-terracotta font-medium mt-3">{airport.tag}</p>
                                    )}
                                </InfoCard>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Accommodations Row */}
                <div>
                    <h3 className="text-olive text-center mb-8 uppercase tracking-widest text-xs font-semibold">Resort Stays & Blocks</h3>
                    <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
                        {config.hotels.map((hotel: any, idx: number) => (
                            <div key={hotel.title} className="w-full md:w-[calc(33.333%-1.5rem)] min-w-0 sm:min-w-[280px] max-w-[350px] flex">
                                <InfoCard title={hotel.title} icon={Hotel}>
                                    <p>{hotel.description}</p>
                                    {hotel.book_url && (
                                        <a href={hotel.book_url} className="inline-block mt-4 text-[10px] uppercase tracking-[0.2em] text-terracotta hover:text-olive transition-colors font-medium border-b border-terracotta/20 pb-0.5">
                                            Book Room
                                        </a>
                                    )}
                                </InfoCard>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Desert Favorites Row */}
                <div>
                    <h3 className="text-olive text-center mb-8 uppercase tracking-widest text-xs font-semibold">Desert Favorites</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {config.favorites.map((fav: any, idx: number) => {
                            const IconComponent = iconMap[fav.icon as keyof typeof iconMap] || MapPin;
                            return (
                                <InfoCard key={fav.title} title={fav.title} icon={IconComponent}>
                                    <p>{fav.description}</p>
                                </InfoCard>
                            );
                        })}
                    </div>
                </div>

                {/* Map Section */}
                <div className="pt-16 border-t border-olive/10">
                    <h3 className="text-olive text-center mb-4 uppercase tracking-widest text-xs font-semibold">Explore the Desert Map</h3>
                    <p className="text-center text-charcoal/60 font-sans text-xs tracking-wider mb-10">Use our interactive guide to find your way around.</p>
                    <MapSection />
                </div>
            </div>
        </section>
    );
}
