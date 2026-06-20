"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({ id: 'desert-concierge' });
  const isLoading = status === 'streaming' || status === 'submitted';
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleManualSubmit = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!input || !input.trim()) return;
    sendMessage({ text: input });
    setInput('');
  };


  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-sage text-white rounded-full flex items-center justify-center shadow-lg hover:bg-sage/90 transition-colors z-50"
            aria-label="Open Desert Concierge"
          >
            <MessageSquare size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-[5vw] right-[5vw] md:left-auto md:right-6 w-auto md:w-[400px] h-[600px] max-h-[80vh] bg-white border border-sage/20 shadow-[-5px_5px_20px_rgba(0,0,0,0.05)] flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-cream px-6 py-5 border-b border-sage/20 flex justify-between items-center isolate">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-sage/10 text-sage flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-serif text-charcoal text-lg">Desert Concierge</h3>
                  <p className="font-sans text-[10px] uppercase tracking-widest text-sage">AI Assistant</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-charcoal/50 hover:text-charcoal transition-colors p-2"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white shrink min-h-0">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-70">
                  <MessageSquare size={32} className="text-sage mx-auto opacity-50" />
                  <p className="font-serif text-charcoal text-lg">Have a question?</p>
                  <p className="font-sans text-xs text-charcoal/70 tracking-wide max-w-[200px]">
                    Ask about the itinerary, dress codes, travel, and more.
                  </p>
                </div>
              )}
              
              {messages.map((m: any) => (
                <React.Fragment key={m.id}>
                  {m.toolInvocations && m.toolInvocations.map((tool: any, i: number) => (
                    <div key={`tool-${i}`} className="flex justify-start mb-2">
                      <div className="px-4 py-2 bg-sage/5 border border-sage/10 rounded-full flex items-center gap-2 text-xs font-mono text-sage">
                         <Sparkles size={12} className="animate-pulse" />
                         {tool.toolName === 'getLiveWeather' && 'Fetching live Indio weather...'}
                         {tool.toolName === 'checkRSVPStatus' && 'Consulting master invite list...'}
                         {tool.toolName !== 'getLiveWeather' && tool.toolName !== 'checkRSVPStatus' && `Running ${tool.toolName}...`}
                      </div>
                    </div>
                  ))}
                  {(() => {
                    const textContent = m.parts?.find((p: any) => p.type === 'text')?.text || m.content;
                    return textContent ? (
                      <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className={`max-w-[85%] px-5 py-4 font-sans text-sm leading-relaxed ${
                            m.role === 'user' 
                              ? 'bg-sage text-white rounded-tl-xl rounded-bl-xl rounded-tr-xl' 
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
                   <div className="max-w-[85%] px-5 py-4 font-sans text-sm leading-relaxed bg-cream border border-sage/10 text-charcoal rounded-tr-xl rounded-br-xl rounded-tl-xl flex space-x-1 items-center">
                     <span className="w-2 h-2 rounded-full bg-sage/40 animate-bounce"></span>
                     <span className="w-2 h-2 rounded-full bg-sage/60 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                     <span className="w-2 h-2 rounded-full bg-sage/80 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                   </div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-sage/10">
              <form onSubmit={handleManualSubmit} className="relative flex items-center">
                <input
                  value={input || ""}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full pl-5 pr-12 py-3 bg-cream/50 border border-sage/20 font-sans text-sm text-charcoal focus:outline-none focus:border-sage transition-colors placeholder:text-charcoal/40"
                  disabled={isLoading}
                />
                <button 
                  type="submit" 
                  disabled={isLoading || !input?.trim()}
                  className="absolute right-2 p-2 text-sage hover:text-sage/80 transition-colors disabled:opacity-50"
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
