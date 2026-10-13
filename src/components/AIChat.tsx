"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';

import { useDialog } from "@/lib/useDialog";

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error, regenerate, clearError } = useChat({ id: 'desert-concierge' });
  const dialogRef = useDialog(isOpen, () => setIsOpen(false), false);
  const reduceMotion = useReducedMotion();
  const isLoading = status === 'streaming' || status === 'submitted';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleManualSubmit = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isLoading || !input || !input.trim()) return;
    clearError();
    sendMessage({ text: input });
    setInput('');
  };


  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'nearest' });
  }, [messages, isOpen, reduceMotion]);

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-olive text-cream rounded-full flex items-center justify-center shadow-floating hover:bg-charcoal transition-colors z-50"
            aria-label="Open Desert Concierge"
          >
            <MessageSquare size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dialogRef} role="dialog" aria-label="Desert Concierge" tabIndex={-1}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-[5vw] right-[5vw] md:left-auto md:right-6 w-auto md:w-[400px] h-[600px] max-h-[calc(100dvh-6rem)] bg-surface border border-line shadow-floating rounded-sm flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-cream px-6 py-5 border-b border-line flex justify-between items-center isolate">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-surface-muted text-olive flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-serif text-charcoal text-lg text-balance">Desert Concierge</h3>
                  <p className="font-sans text-label uppercase tracking-label text-olive">AI Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                aria-label="Close Desert Concierge"
                className="text-muted hover:text-charcoal transition-colors p-2"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface shrink min-h-0">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <MessageSquare size={32} className="text-sage mx-auto opacity-50" />
                  <p className="font-serif text-charcoal text-lg leading-relaxed">Have a question?</p>
                  <p className="font-sans text-copy text-charcoal/80 tracking-normal max-w-[200px]">
                    Ask about the itinerary, dress codes, travel, and more.
                  </p>
                </div>
              )}
              
              {messages.map((m: any) => (
                <React.Fragment key={m.id}>
                  {m.toolInvocations && m.toolInvocations.map((tool: any, i: number) => (
                    <div key={`tool-${i}`} className="flex justify-start mb-2">
                      <div className="px-4 py-2 bg-sage/5 border border-sage/10 rounded-full flex items-center gap-2 text-caption font-sans text-olive">
                         <Sparkles size={12} className="animate-pulse" />
                         {tool.toolName === 'getLiveWeather' && 'Fetching live Indio weather...'}
                         {tool.toolName === 'checkRSVPStatus' && 'Consulting master invite list...'}
                         {tool.toolName !== 'getLiveWeather' && tool.toolName !== 'checkRSVPStatus' && `Running ${tool.toolName}...`}
                      </div>
                    </div>
                  ))}
                  {(() => {
                    const textContent = m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || m.content;
                    return textContent ? (
                      <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className={`max-w-[85%] px-5 py-4 font-sans text-copy leading-relaxed ${
                            m.role === 'user' 
                              ? 'bg-olive text-cream rounded-tl-xl rounded-bl-xl rounded-tr-xl'
                              : 'bg-cream border border-sage/10 text-charcoal rounded-tr-xl rounded-br-xl rounded-tl-xl'
                          }`}
                        >
                          {textContent}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </React.Fragment>
              ))}
              {isLoading && (
                 <div className="flex justify-start">
                   <div className="max-w-[85%] px-5 py-4 font-sans text-copy leading-relaxed bg-cream border border-sage/10 text-charcoal rounded-tr-xl rounded-br-xl rounded-tl-xl flex space-x-1 items-center">
                     <span className="w-2 h-2 rounded-full bg-sage/40 animate-bounce"></span>
                     <span className="w-2 h-2 rounded-full bg-sage/60 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                     <span className="w-2 h-2 rounded-full bg-sage/80 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                   </div>
                 </div>
              )}
              {error && <div role="alert" className="text-copy font-sans text-danger">The concierge couldn't respond. Please try again or check the FAQ. <button onClick={() => regenerate()} className="underline ml-1">Retry</button></div>}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-surface border-t border-sage/10">
              <form onSubmit={handleManualSubmit} className="relative flex items-center">
                <input
                  value={input || ""}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  aria-label="Question for the concierge"
                  maxLength={2000}
                  className="w-full pl-5 pr-12 py-3 bg-cream/50 border border-line font-sans text-base text-charcoal focus:outline-none focus:border-action transition-colors placeholder:text-muted"
                  disabled={isLoading}
                />
                <button 
                  type="submit"
                  aria-label="Send question"
                  disabled={isLoading || !input?.trim()}
                  className="absolute right-2 p-2 text-action hover:text-action-hover transition-colors disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
