"use client";

import React, { useState, useEffect } from "react";
import { scrollToSection } from "@/lib/scrollToSection";

const tabs = [
  { id: "our-story", label: "Story" },
  { id: "weekend", label: "Weekend" },
  { id: "travel", label: "Travel" },
  { id: "registry", label: "Registry" },
  { id: "faq", label: "FAQ" },
  { id: "rsvp", label: "RSVP" },
];

export default function NavigationTabs() {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      // Find active section
      const sections = tabs.map(tab => document.getElementById(tab.id));
      const scrollPosition = window.scrollY + window.innerHeight / 3; 

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveId(tabs[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  return (
    <nav
      aria-label="Wedding sections"
      className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-md border-b border-olive/10 shadow-sm"
    >
      <div className="max-w-4xl mx-auto px-4 overflow-x-auto">
        <ul className="flex items-center justify-center md:justify-center min-w-max space-x-4 md:space-x-6 py-4 mx-auto">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => scrollToSection(tab.id)}
                aria-current={activeId === tab.id ? "location" : undefined}
                className={`font-sans text-caption tracking-normal transition-colors cursor-pointer ${
                  activeId === tab.id
                    ? "text-action font-semibold"
                    : "text-muted hover:text-olive"
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
