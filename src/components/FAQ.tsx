/* eslint-disable */
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { mockDatabase } from '@/lib/mockDatabase';
import faqConfigDefault from "@config/ui/faq.json";

function FAQItem({ faq, index }: { faq: { q: string, a: string }, index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      viewport={{ once: true }}
      className="border-b border-olive/15 last:border-b-0"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left py-6 flex justify-between items-center group focus:outline-none"
      >
        <h3 className={`text-lg font-serif transition-colors duration-300 pr-8 ${isOpen ? 'text-terracotta' : 'text-charcoal hover:text-olive'}`}>
          {faq.q}
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className={`transition-colors duration-300 flex-shrink-0 ${isOpen ? 'text-terracotta' : 'text-olive/50 group-hover:text-olive'}`}
        >
          <ChevronDown size={18} strokeWidth={1.5} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-6 font-sans text-xs sm:text-sm tracking-wide text-charcoal/70 leading-relaxed pr-8 space-y-2">
              {faq.a.split('\n').map((paragraph, pIndex) => (
                <p key={pIndex}>{paragraph}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  const [config, setConfig] = useState(faqConfigDefault);

  useEffect(() => {
    mockDatabase.getSiteConfig("faq", faqConfigDefault).then(setConfig);
  }, []);

  const faqs = config.list;

  return (
    <section id="faq" className="py-28 bg-cream px-6 border-t border-olive/10">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-terracotta block mb-3 font-medium">FAQ</span>
          <h2 className="text-4xl md:text-5xl font-serif text-charcoal mb-4">
            {config.title}
          </h2>
          <p className="text-olive font-serif italic text-base max-w-md mx-auto">
            {config.subtitle}
          </p>
        </motion.div>

        <div className="bg-cream/40 border border-olive/15 backdrop-blur-[2px] p-8 md:p-12 rounded-sm shadow-sm">
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
