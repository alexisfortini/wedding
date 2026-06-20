"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show tabs after scrolling past hero (approx 80vh)
      setIsVisible(window.scrollY > window.innerHeight * 0.8);

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

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: isVisible ? 0 : -100, opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-md border-b border-olive/10 shadow-sm"
    >
      <div className="max-w-4xl mx-auto px-4 overflow-x-auto">
        <ul className="flex items-center justify-center md:justify-center min-w-max space-x-6 py-4 mx-auto">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                onClick={() => scrollTo(tab.id)}
                className={`font-sans text-[10px] uppercase tracking-[0.2em] transition-colors ${
                  activeId === tab.id
                    ? "text-terracotta font-semibold"
                    : "text-charcoal/60 hover:text-olive"
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </motion.nav>
  );
}
