"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Heart, Smartphone, DollarSign, CheckCircle2,
  Copy, Check, ExternalLink, QrCode, ShieldCheck, Loader2,
  ArrowRight, Gift
} from "lucide-react";
import { mockDatabase } from "@/lib/mockDatabase";
import defaultRegistryConfig from "@config/ui/registry.json";

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const duration = 1200;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (value - startValue) * easeOut);
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(step);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

export default function HoneymoonFundPage() {
  const [config, setConfig] = useState<any>(defaultRegistryConfig);
  const [totalRaised, setTotalRaised] = useState<number>(0);
  const [targetAmount, setTargetAmount] = useState<number>(5000);
  const [activeTab, setActiveTab] = useState<"venmo" | "zelle">("venmo");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Self-report form state
  const [reportName, setReportName] = useState<string>("");
  const [reportAmount, setReportAmount] = useState<string>("");
  const [reportMethod, setReportMethod] = useState<"venmo" | "zelle" | "cash">("venmo");
  const [reportNote, setReportNote] = useState<string>("");
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(null);

  const loadContributions = useCallback(() => {
    mockDatabase.getFundContributions().then((res) => {
      setTotalRaised(res.totalRaised || 0);
      if (res.targetAmount) setTargetAmount(res.targetAmount);
    });
  }, []);

  useEffect(() => {
    mockDatabase.getSiteConfig("registry", defaultRegistryConfig).then(setConfig);
    loadContributions();

    // Auto pre-fill guest name if session exists
    try {
      const savedGuestStr = localStorage.getItem("wedding_guest");
      if (savedGuestStr) {
        const g = JSON.parse(savedGuestStr);
        if (g?.first_name) {
          setReportName(`${g.first_name} ${g.last_name || ""}`.trim());
        }
      }
    } catch {
      // ignore
    }
  }, [loadContributions]);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleSubmitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName.trim()) {
      setReportErrorMessage("Please enter your name.");
      return;
    }
    const numAmount = parseFloat(reportAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setReportErrorMessage("Please enter a valid gift amount.");
      return;
    }

    setIsSubmittingReport(true);
    setReportErrorMessage(null);
    try {
      await mockDatabase.addFundContribution({
        guestName: reportName.trim(),
        amount: numAmount,
        paymentMethod: reportMethod,
        note: reportNote.trim() || undefined
      });

      setTotalRaised((prev) => Math.round((prev + numAmount) * 100) / 100);
      setReportSuccess(true);
    } catch (err: any) {
      setReportErrorMessage(err.message || "Failed to record contribution. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const resetReportForm = () => {
    setReportSuccess(false);
    setReportAmount("");
    setReportNote("");
    setReportErrorMessage(null);
  };

  const cashFund = config.cash_fund || config.honeymoon_fund || (defaultRegistryConfig as any).cash_fund || {};
  const venmoHandle = (cashFund.venmo_handle || "@Alexis-Fortini").trim();
  const cleanVenmoHandle = venmoHandle.replace(/^@/, "");
  const venmoQrImage = cashFund.venmo_qr_image || "/images/venmo-qr.png";
  const zelleRecipient = (cashFund.zelle_recipient || "Alexis Fortini").trim();
  const zelleEmail = (cashFund.zelle_email || (zelleRecipient.includes("@") ? zelleRecipient : "axs.fortini@gmail.com")).trim();
  const zellePhone = (cashFund.zelle_phone || "425-283-7699").trim();
  const venmoDeepLink = `https://venmo.com/?txn=pay&recipients=${encodeURIComponent(cleanVenmoHandle)}&note=Honeymoon%20Fund`;

  const progressPercent = targetAmount > 0 ? Math.min(Math.round((totalRaised / targetAmount) * 100), 100) : 0;

  return (
    <main className="min-h-screen bg-cream text-charcoal py-12 md:py-20 px-4 sm:px-6 md:px-12">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Navigation & Header */}
        <div>
          <Link
            href="/#registry"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-charcoal/60 hover:text-terracotta transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Wedding Site</span>
          </Link>

          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-terracotta/10 border border-terracotta/20 text-terracotta text-xs font-semibold uppercase tracking-widest">
              <Heart size={13} className="fill-current text-terracotta" />
              <span>{cashFund.tag || "Honeymoon Fund"}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-charcoal">
              {cashFund.title || "Honeymoon Fund"}
            </h1>
            <p className="text-charcoal/70 font-sans text-sm md:text-base leading-relaxed">
              {cashFund.description || "Having your presence celebrate with us is the greatest gift of all. If you would like to help us celebrate with a gift toward our honeymoon getaway, you can do so below."}
            </p>
          </div>
        </div>

        {/* Prominent Live Counter Display */}
        <div className="bg-white border border-sage/20 rounded-sm p-6 sm:p-8 shadow-sm text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-sans uppercase tracking-wider font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Running Total</span>
          </div>
          <div className="text-4xl sm:text-5xl font-serif text-charcoal font-medium">
            $<AnimatedCounter value={totalRaised} />
          </div>
          <div className="text-xs uppercase tracking-wider text-charcoal/50 mt-1">
            Contributed So Far
          </div>

          {targetAmount > 0 && (
            <div className="mt-5 pt-5 border-t border-sage/15 max-w-md mx-auto">
              <div className="flex justify-between text-xs text-charcoal/70 mb-1.5 font-medium">
                <span>Goal: ${targetAmount.toLocaleString()}</span>
                <span>{progressPercent}% Funded</span>
              </div>
              <div className="w-full h-2 bg-cream/70 rounded-full overflow-hidden border border-sage/15">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-terracotta rounded-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid: Payment Methods on Left, Self-Report on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Payment Instructions (Venmo / Zelle) */}
          <div className="lg:col-span-7 bg-white border border-sage/20 rounded-sm shadow-sm overflow-hidden flex flex-col">
            
            {/* Tab Selection */}
            <div className="bg-cream/40 border-b border-sage/15 p-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab("venmo")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm text-xs font-sans uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "venmo"
                    ? "bg-white text-charcoal shadow-xs border border-sage/20 font-semibold"
                    : "text-charcoal/60 hover:text-charcoal hover:bg-cream/50 font-medium"
                }`}
              >
                <Smartphone size={15} />
                <span>Venmo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("zelle")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm text-xs font-sans uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === "zelle"
                    ? "bg-white text-charcoal shadow-xs border border-sage/20 font-semibold"
                    : "text-charcoal/60 hover:text-charcoal hover:bg-cream/50 font-medium"
                }`}
              >
                <DollarSign size={15} />
                <span>Zelle</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* TAB 1: VENMO */}
              {activeTab === "venmo" && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-serif text-charcoal">Venmo</h3>
                    <p className="text-xs sm:text-sm font-sans text-charcoal/70 leading-relaxed">
                      Scan the QR code with your phone camera or app, or copy our handle below.
                    </p>
                  </div>

                  {/* QR Code Container */}
                  <div className="bg-cream/30 border border-sage/20 p-6 rounded-sm text-center max-w-sm mx-auto shadow-2xs">
                    <div className="relative inline-block bg-white p-3 rounded-md border border-sage/20 shadow-xs mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={venmoQrImage}
                        alt="Venmo QR Code"
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-xs font-sans text-charcoal/60">
                      <QrCode size={14} className="text-charcoal/50" />
                      <span>Scan with phone camera or Venmo app</span>
                    </div>
                  </div>

                  {/* Handle & Deep Link */}
                  <div className="space-y-3 max-w-sm mx-auto">
                    <div className="flex items-center justify-between bg-cream/30 border border-sage/20 p-3 rounded-sm">
                      <div>
                        <span className="block text-[9px] uppercase tracking-widest text-charcoal/50 font-semibold">Venmo Handle</span>
                        <span className="font-mono text-sm font-bold text-charcoal">@{cleanVenmoHandle}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(`@${cleanVenmoHandle}`, "venmo")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded bg-white border border-sage/25 text-charcoal hover:bg-cream/40 transition-colors cursor-pointer"
                      >
                        {copiedKey === "venmo" ? (
                          <>
                            <Check size={13} className="text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Copy Handle</span>
                          </>
                        )}
                      </button>
                    </div>

                    <a
                      href={venmoDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full font-sans text-xs uppercase tracking-[0.2em] bg-terracotta text-cream py-3.5 rounded-sm hover:bg-charcoal transition-colors font-semibold shadow-sm flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <Smartphone size={15} />
                      <span>Open in Venmo App</span>
                      <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              )}

              {/* TAB 2: ZELLE */}
              {activeTab === "zelle" && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-serif text-charcoal">Zelle</h3>
                    <p className="text-xs sm:text-sm font-sans text-charcoal/70 leading-relaxed">
                      Send directly with 0% transaction fees using your mobile banking app (Chase, BoA, Wells Fargo, etc.) or the Zelle app.
                    </p>
                  </div>

                  <div className="bg-cream/30 border border-sage/20 p-6 rounded-sm space-y-4 max-w-sm mx-auto shadow-2xs">
                    <div>
                      <span className="block text-[9px] uppercase tracking-widest text-charcoal/50 font-semibold mb-1">Recipient Name</span>
                      <p className="font-serif text-lg text-charcoal font-medium">{zelleRecipient || "Alexis Fortini"}</p>
                    </div>

                    {zelleEmail && (
                      <div className="pt-3 border-t border-sage/15 flex items-center justify-between">
                        <div>
                          <span className="block text-[9px] uppercase tracking-widest text-charcoal/50 font-semibold">Registered Email</span>
                          <span className="font-mono text-xs font-semibold text-charcoal">{zelleEmail}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(zelleEmail, "zelle-email")}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded bg-white border border-sage/25 text-charcoal hover:bg-cream/40 transition-colors cursor-pointer"
                        >
                          {copiedKey === "zelle-email" ? (
                            <>
                              <Check size={13} className="text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {zellePhone && (
                      <div className="pt-3 border-t border-sage/15 flex items-center justify-between">
                        <div>
                          <span className="block text-[9px] uppercase tracking-widest text-charcoal/50 font-semibold">Registered Phone</span>
                          <span className="font-mono text-xs font-semibold text-charcoal">{zellePhone}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(zellePhone, "zelle-phone")}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded bg-white border border-sage/25 text-charcoal hover:bg-cream/40 transition-colors cursor-pointer"
                        >
                          {copiedKey === "zelle-phone" ? (
                            <>
                              <Check size={13} className="text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="pt-3 border-t border-sage/15 text-xs font-sans text-charcoal/70">
                      <span className="font-semibold text-charcoal">Memo / Note:</span> Honeymoon Fund
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT: Self-Report / Confirmation Form */}
          <div className="lg:col-span-5 bg-white border border-sage/20 rounded-sm p-6 sm:p-8 shadow-sm">
            {reportSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-serif text-charcoal">Thank You So Much, {reportName}!</h3>
                <p className="text-sm font-sans text-charcoal/80 leading-relaxed">
                  Your generous contribution of <span className="font-semibold text-terracotta">${reportAmount}</span> has been recorded and added to our live honeymoon counter.
                </p>
                <p className="text-xs font-serif italic text-charcoal/60">
                  We are so deeply grateful for your love and support, and cannot wait to celebrate together! 🌴🥂
                </p>

                <div className="pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={resetReportForm}
                    className="w-full py-2.5 bg-cream/40 border border-sage/30 text-charcoal text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-cream/70 transition-colors cursor-pointer"
                  >
                    Record Another Gift
                  </button>
                  <Link
                    href="/#registry"
                    className="w-full py-2.5 bg-terracotta text-cream text-xs uppercase tracking-wider font-semibold rounded-sm hover:bg-charcoal transition-colors text-center"
                  >
                    Return to Wedding Site
                  </Link>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmitContribution} className="space-y-5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-terracotta font-semibold block">
                    Sent Your Gift?
                  </span>
                  <h3 className="text-2xl font-serif text-charcoal">Record Your Gift</h3>
                  <p className="text-xs font-sans text-charcoal/70 leading-relaxed">
                    Let us know so we can update our live counter and send our warmest thanks.
                  </p>
                </div>

                {reportErrorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-sm">
                    {reportErrorMessage}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Guest Name */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1 font-semibold">
                      Your Name(s) <span className="text-terracotta">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="e.g. Alexis & Kelsey or The Smith Family"
                      className="w-full border border-sage/30 p-2.5 text-sm bg-white rounded-sm outline-none focus:border-terracotta transition-colors"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1 font-semibold">
                      Contribution Amount ($) <span className="text-terracotta">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-charcoal/40 font-serif text-base">$</span>
                      <input
                        type="number"
                        required
                        min="1"
                        step="any"
                        value={reportAmount}
                        onChange={(e) => setReportAmount(e.target.value)}
                        placeholder="100"
                        className="w-full border border-sage/30 pl-8 pr-3 p-2.5 text-sm bg-white rounded-sm outline-none focus:border-terracotta font-mono font-semibold"
                      />
                    </div>
                    {/* Quick picks */}
                    <div className="flex gap-2 mt-2">
                      {["50", "100", "200", "500"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setReportAmount(preset)}
                          className="text-xs font-mono px-2.5 py-1 rounded bg-cream/40 border border-sage/20 hover:border-terracotta text-charcoal/80 cursor-pointer transition-colors"
                        >
                          +${preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1.5 font-semibold">
                      Payment Method <span className="text-terracotta">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["venmo", "zelle", "cash"] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => {
                            setReportMethod(method);
                            if (method === "venmo" || method === "zelle") {
                              setActiveTab(method);
                            }
                          }}
                          className={`py-2 px-2 text-xs uppercase tracking-wider font-semibold rounded-sm border transition-all cursor-pointer flex items-center justify-center ${
                            reportMethod === method
                              ? "bg-terracotta text-cream border-terracotta shadow-xs"
                              : "bg-cream/20 text-charcoal/70 border-sage/20 hover:bg-cream/40"
                          }`}
                        >
                          {method === "venmo" && "Venmo"}
                          {method === "zelle" && "Zelle"}
                          {method === "cash" && "Cash / Check"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-charcoal/50 mb-1 font-semibold">
                      Note <span className="text-charcoal/30 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={reportNote}
                      onChange={(e) => setReportNote(e.target.value)}
                      placeholder="Write a personal note for Alexis & Kelsey..."
                      className="w-full border border-sage/30 p-2.5 text-sm bg-white rounded-sm outline-none focus:border-terracotta resize-none transition-colors"
                    />
                    <p className="text-[11px] font-sans text-charcoal/50 italic flex items-center gap-1.5 pt-1.5">
                      <ShieldCheck size={14} className="text-emerald-700 shrink-0" />
                      <span>Your gift amount and note are kept strictly private between you and the couple.</span>
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="w-full font-sans text-xs uppercase tracking-[0.2em] bg-terracotta text-cream py-3.5 rounded-sm hover:bg-charcoal transition-colors font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReport ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <Heart size={14} className="fill-current" />
                        <span>Record Contribution</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>

        {/* Footer Alternative Link */}
        <div className="pt-8 border-t border-sage/20 text-center">
          <p className="text-sm font-sans text-charcoal/70">
            Looking for our curated home & physical gift registry?{" "}
            <Link
              href="/registry/items"
              className="font-semibold text-terracotta hover:underline inline-flex items-center gap-1"
            >
              <span>View Registry Items</span>
              <ArrowRight size={13} />
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}
