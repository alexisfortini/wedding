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
        className="w-full h-full p-6 lg:p-8 border border-line bg-surface rounded-sm flex flex-col items-center text-center space-y-4"
    >
        <div className="h-10 flex items-center justify-center text-action mb-2" aria-hidden="true">
            <Icon size={22} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-serif text-charcoal tracking-normal text-balance">{title}</h3>
        <div className="font-sans text-copy text-charcoal/80 leading-relaxed space-y-2">
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
        <section id="travel" className="py-16 md:py-24 bg-cream px-6 border-t border-olive/10">
            <div className="max-w-6xl mx-auto space-y-10 md:space-y-12">
                <div className="text-center">
                    <span className="font-sans text-label uppercase tracking-label text-action block mb-3 font-medium">Logistics</span>
                    <h2 className="text-4xl md:text-5xl font-serif text-charcoal mb-4 text-balance">
                        {config.title}
                    </h2>
                    <p className="text-olive font-serif italic text-lg max-w-md mx-auto leading-relaxed">
                        {config.description}
                    </p>
                </div>

                {/* Airports Row */}
                <div>
                    <h3 className="text-olive text-center mb-6 uppercase tracking-label text-xs font-semibold text-balance">Airports</h3>
                    <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
                        {config.airports.map((airport: any, idx: number) => (
                            <div key={airport.title} className="flex w-full max-w-md sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]">
                                <InfoCard title={airport.title} icon={Plane}>
                                    <p>{airport.description}</p>
                                    {airport.tag && (
                                        <p className="text-label uppercase tracking-label text-action font-medium mt-3">{airport.tag}</p>
                                    )}
                                </InfoCard>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Accommodations Row */}
                <div>
                    <h3 className="text-olive text-center mb-6 uppercase tracking-label text-xs font-semibold text-balance">Resort Stays & Blocks</h3>
                    <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
                        {config.hotels.map((hotel: any, idx: number) => (
                            <div key={hotel.title} className="flex w-full max-w-md sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]">
                                <InfoCard title={hotel.title} icon={Hotel}>
                                    <p>{hotel.description}</p>
                                    {hotel.book_url && (
                                        <a href={hotel.book_url} className="inline-block mt-4 text-label uppercase tracking-label text-action hover:text-olive transition-colors font-medium border-b border-terracotta/20 pb-0.5">
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
                    <h3 className="text-olive text-center mb-6 uppercase tracking-label text-xs font-semibold text-balance">Desert Favorites</h3>
                    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6 max-w-md sm:max-w-none mx-auto">
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
                <div className="pt-10 md:pt-12 border-t border-olive/10">
                    <h3 className="text-olive text-center mb-4 uppercase tracking-label text-xs font-semibold text-balance">Explore the Desert Map</h3>
                    <p className="text-center text-muted font-sans text-copy tracking-label mb-8 md:mb-10">Use our interactive guide to find your way around.</p>
                    <MapSection />
                </div>
            </div>
        </section>
    );
}
