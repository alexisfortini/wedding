"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Heart, Smartphone, DollarSign, CheckCircle2,
  Copy, Check, ExternalLink, QrCode, ShieldCheck, Loader2,
  ArrowRight, Gift
} from "lucide-react";
import { mockDatabase } from "@/lib/mockDatabase";
import defaultRegistryConfig from "@config/ui/registry.json";

import AnimatedCounter from "@/components/AnimatedCounter";

export default function HoneymoonFundPage() {
  const [config, setConfig] = useState<any>(defaultRegistryConfig);
  const [fundStatus, setFundStatus] = useState<string | null>("Loading gift total…");
  const [totalRaised, setTotalRaised] = useState<number>(0);
  const [targetAmount, setTargetAmount] = useState<number>(5000);
  const [activeTab, setActiveTab] = useState<"venmo" | "zelle">("venmo");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const requestRef = useRef<{ id: string; signature: string } | null>(null);
  const [copyError, setCopyError] = useState("");

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
      setTargetAmount(res.targetAmount);
      setFundStatus(null);
    }).catch(() => setFundStatus("Gift total is temporarily unavailable."));
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

  const handleCopy = async (text: string, key: string) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setCopyError(""); }
    catch { setCopyError("Copying is unavailable in this browser. Please select and copy the payment details manually."); return; }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleSubmitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReport) return;
    if (!reportName.trim()) {
      setReportErrorMessage("Please enter your name.");
      return;
    }
    const numAmount = Number(reportAmount);
    if (!Number.isFinite(numAmount) || numAmount < 0.01 || numAmount > 1000000) {
      setReportErrorMessage("Please enter a valid gift amount.");
      return;
    }

    setIsSubmittingReport(true);
    setReportErrorMessage(null);
    try {
      const signature = JSON.stringify([reportName.trim(), numAmount, reportMethod, reportNote.trim()]);
      if (requestRef.current?.signature !== signature) requestRef.current = { id: crypto.randomUUID(), signature };
      await mockDatabase.addFundContribution({
        id: requestRef.current.id,
        guestName: reportName.trim(),
        amount: numAmount,
        paymentMethod: reportMethod,
        note: reportNote.trim() || undefined
      });

      loadContributions();
      setReportSuccess(true);
    } catch (err: any) {
      setReportErrorMessage(err.message || "Failed to record contribution. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const resetReportForm = () => {
    requestRef.current = null;
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
            className="inline-flex items-center gap-2 text-xs uppercase tracking-label text-muted hover:text-action transition-colors mb-8 group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Wedding Site</span>
          </Link>

          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 text-action text-xs font-semibold uppercase tracking-label">
              <Heart size={13} className="fill-current text-action" />
              <span>{cashFund.tag || "Honeymoon Fund"}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-charcoal text-balance">
              {cashFund.title || "Honeymoon Fund"}
            </h1>
            <p className="text-charcoal/80 font-sans text-copy md:text-base leading-relaxed">
              {cashFund.description || "Having your presence celebrate with us is the greatest gift of all. If you would like to help us celebrate with a gift toward our honeymoon getaway, you can do so below."}
            </p>
          </div>
        </div>

        {/* Prominent Live Counter Display */}
        <div className="bg-surface border border-line rounded-sm p-6 sm:p-8 shadow-card text-center max-w-xl mx-auto">
          <div className="text-muted text-xs font-sans uppercase tracking-label font-semibold mb-3">
            <span>Fund Total</span>
          </div>
          <div className="text-4xl sm:text-5xl font-serif text-charcoal font-medium h-12 flex items-baseline justify-center leading-none">
            {fundStatus ? "—" : <>$<AnimatedCounter value={totalRaised} /></>}
          </div>
          <div className="text-xs uppercase tracking-label text-muted mt-1.5">
            {fundStatus || "Contributed So Far"}
          </div>

          <div hidden={!!fundStatus} className="mt-5 pt-5 border-t border-line max-w-md mx-auto">
            <div className="flex justify-between text-xs text-charcoal/80 mb-1.5 font-medium">
              <span>Goal: ${(targetAmount || 5000).toLocaleString()}</span>
              <span>{progressPercent}% Funded</span>
            </div>
            <div className="w-full h-2 bg-cream/70 rounded-full overflow-hidden border border-line">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-terracotta rounded-full"
              />
            </div>
          </div>
        </div>

        {copyError && <p role="alert" className="text-copy font-sans text-danger">{copyError}</p>}

        {/* Main Content Grid: Payment Methods on Left, Self-Report on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          
          {/* LEFT: Payment Instructions (Venmo / Zelle) */}
          <div className="h-full bg-surface border border-line rounded-sm shadow-card overflow-hidden flex flex-col">
            
            {/* Tab Selection */}
            <div className="bg-cream/40 border-b border-line p-1.5 flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("venmo")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm text-xs font-sans uppercase tracking-label transition-all cursor-pointer ${
                  activeTab === "venmo"
                    ? "bg-surface text-charcoal shadow-card border border-line font-semibold"
                    : "text-muted hover:text-charcoal hover:bg-cream/50 font-medium"
                }`}
              >
                <Smartphone size={15} />
                <span>Venmo</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("zelle")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm text-xs font-sans uppercase tracking-label transition-all cursor-pointer ${
                  activeTab === "zelle"
                    ? "bg-surface text-charcoal shadow-card border border-line font-semibold"
                    : "text-muted hover:text-charcoal hover:bg-cream/50 font-medium"
                }`}
              >
                <DollarSign size={15} />
                <span>Zelle</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              
              {/* TAB 1: VENMO */}
              {activeTab === "venmo" && (
                <div className="flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-1">
                    <span className="text-label uppercase tracking-label text-action font-semibold block">
                      Option 1
                    </span>
                    <h3 className="text-2xl font-serif text-charcoal text-balance">Venmo</h3>
                    <p className="text-copy font-sans text-charcoal/80 leading-relaxed">
                      Scan the QR code with your phone camera or app, or copy our handle below.
                    </p>
                  </div>

                  {/* QR Code Container */}
                  <div className="flex-1 flex flex-col items-center justify-center bg-cream/30 border border-line p-3 sm:p-6 rounded-sm text-center w-full shadow-card">
                    <div className="relative inline-block max-w-full bg-white p-3 rounded-sm border border-line shadow-card mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={venmoQrImage}
                        alt="Venmo QR Code"
                        className="w-48 sm:w-52 max-w-full h-auto aspect-square object-contain mx-auto"
                      />
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-xs font-sans text-muted">
                      <QrCode size={14} className="text-muted" />
                      <span>Scan with phone camera or Venmo app</span>
                    </div>
                  </div>

                  {/* Handle & Deep Link */}
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between bg-cream/30 border border-line p-3.5 rounded-sm">
                      <div>
                        <span className="block text-label uppercase tracking-label text-muted font-semibold">Venmo Handle</span>
                        <span className="font-sans tabular-nums text-sm font-bold text-charcoal">@{cleanVenmoHandle}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(`@${cleanVenmoHandle}`, "venmo")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-sm bg-surface border border-line text-charcoal hover:bg-cream/40 transition-colors cursor-pointer"
                      >
                        {copiedKey === "venmo" ? (
                          <>
                            <Check size={13} className="text-success" />
                            <span className="text-success font-semibold">Copied!</span>
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
                      className="w-full h-12 font-sans text-xs uppercase tracking-label bg-action text-cream rounded-sm hover:bg-action-hover transition-colors font-semibold shadow-card flex items-center justify-center gap-2 group cursor-pointer"
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
                <div className="flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-1">
                    <span className="text-label uppercase tracking-label text-action font-semibold block">
                      Option 2
                    </span>
                    <h3 className="text-2xl font-serif text-charcoal text-balance">Zelle</h3>
                    <p className="text-copy font-sans text-charcoal/80 leading-relaxed">
                      Send directly with 0% transaction fees using your mobile banking app (Chase, BoA, Wells Fargo, etc.) or the Zelle app.
                    </p>
                  </div>

                  <div className="flex-1 flex flex-col justify-center bg-cream/30 border border-line p-6 rounded-sm space-y-5 w-full shadow-card">
                    <div>
                      <span className="block text-label uppercase tracking-label text-muted font-semibold mb-1">Recipient Name</span>
                      <p className="font-serif text-lg text-charcoal font-medium leading-relaxed">{zelleRecipient || "Alexis Fortini"}</p>
                    </div>

                    {zelleEmail && (
                      <div className="pt-4 border-t border-line flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block text-label uppercase tracking-label text-muted font-semibold">Registered Email</span>
                          <span className="font-sans tabular-nums text-copy font-semibold text-charcoal truncate block">{zelleEmail}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(zelleEmail, "zelle-email")}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-sm bg-surface border border-line text-charcoal hover:bg-cream/40 transition-colors cursor-pointer"
                        >
                          {copiedKey === "zelle-email" ? (
                            <>
                              <Check size={13} className="text-success" />
                              <span className="text-success font-semibold">Copied!</span>
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
                      <div className="pt-4 border-t border-line flex items-center justify-between gap-2">
                        <div>
                          <span className="block text-label uppercase tracking-label text-muted font-semibold">Registered Phone</span>
                          <span className="font-sans tabular-nums text-copy font-semibold text-charcoal">{zellePhone}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(zellePhone, "zelle-phone")}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-sm bg-surface border border-line text-charcoal hover:bg-cream/40 transition-colors cursor-pointer"
                        >
                          {copiedKey === "zelle-phone" ? (
                            <>
                              <Check size={13} className="text-success" />
                              <span className="text-success font-semibold">Copied!</span>
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

                    <div className="pt-4 border-t border-line text-xs font-sans text-charcoal/80">
                      <span className="font-semibold text-charcoal">Memo / Note:</span> Honeymoon Fund
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT: Self-Report / Confirmation Form */}
          <div className="h-full bg-surface border border-line rounded-sm shadow-card overflow-hidden flex flex-col">
            <div className="bg-cream/40 border-b border-line p-1.5 flex items-center justify-center shrink-0">
              <div className="py-2.5 px-4 text-xs font-sans uppercase tracking-label text-charcoal font-semibold flex items-center gap-2">
                <Heart size={14} className="text-action fill-current" />
                <span>Gift Confirmation</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex-1 flex flex-col">
              {reportSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col items-center justify-center py-8 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-success-soft text-success mx-auto flex items-center justify-center">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-2xl font-serif text-charcoal text-balance">Thank You So Much, {reportName}!</h3>
                  <p className="text-copy font-sans text-charcoal/80 leading-relaxed max-w-sm">
                    Your generous contribution of <span className="font-semibold text-action">${reportAmount}</span> has been recorded and added to our live honeymoon counter.
                  </p>
                  <p className="text-lg font-serif italic text-muted max-w-sm leading-relaxed">
                    We are so deeply grateful for your love and support, and cannot wait to celebrate together! 🌴🥂
                  </p>

                  <div className="pt-4 flex flex-col gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={resetReportForm}
                      className="w-full h-11 bg-cream/40 border border-line text-charcoal text-xs uppercase tracking-label font-semibold rounded-sm hover:bg-cream/70 transition-colors cursor-pointer"
                    >
                      Record Another Gift
                    </button>
                    <Link
                      href="/#registry"
                      className="w-full h-12 bg-action text-cream text-xs uppercase tracking-label font-semibold rounded-sm hover:bg-action-hover transition-colors flex items-center justify-center"
                    >
                      Return to Wedding Site
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmitContribution} className="flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <span className="text-label uppercase tracking-label text-action font-semibold block">
                        Sent Your Gift?
                      </span>
                      <h3 className="text-2xl font-serif text-charcoal text-balance">Record Your Gift</h3>
                      <p className="text-copy font-sans text-charcoal/80 leading-relaxed">
                        Let us know so we can update our live counter and send our warmest thanks.
                      </p>
                    </div>

                    {reportErrorMessage && (
                      <div className="p-3 bg-danger-soft border border-danger-line text-danger text-xs rounded-sm">
                        {reportErrorMessage}
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Guest Name */}
                      <div>
                        <label className="block text-label uppercase tracking-label text-muted mb-1.5 font-semibold">
                          Your Name(s) <span className="text-action">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          aria-label="Your names" maxLength={200}
                          value={reportName}
                          onChange={(e) => setReportName(e.target.value)}
                          placeholder="e.g. Alexis & Kelsey or The Smith Family"
                          className="w-full h-11 border border-line px-3 text-base bg-surface rounded-sm outline-none focus:border-action transition-colors"
                        />
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-label uppercase tracking-label text-muted mb-1.5 font-semibold">
                          Contribution Amount ($) <span className="text-action">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-muted font-serif text-base">$</span>
                          <input
                            type="number"
                            required
                            min="1"
                            step="any"
                            aria-label="Contribution amount in dollars"
                            value={reportAmount}
                            onChange={(e) => setReportAmount(e.target.value)}
                            placeholder="100"
                            className="w-full h-11 border border-line pl-8 pr-3 text-base bg-surface rounded-sm outline-none focus:border-action font-sans tabular-nums font-semibold"
                          />
                        </div>
                        {/* Quick picks */}
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {["50", "100", "200", "500"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setReportAmount(preset)}
                              className="text-xs font-sans tabular-nums py-1.5 rounded-sm bg-cream/40 border border-line hover:border-terracotta text-charcoal/80 cursor-pointer transition-colors text-center"
                            >
                              +${preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-label uppercase tracking-label text-muted mb-1.5 font-semibold">
                          Payment Method <span className="text-action">*</span>
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
                              className={`h-10 px-2 text-xs uppercase tracking-label font-semibold rounded-sm border transition-all cursor-pointer flex items-center justify-center ${
                                reportMethod === method
                                  ? "bg-action text-cream border-action shadow-card"
                                  : "bg-cream/20 text-charcoal/80 border-line hover:bg-cream/40"
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
                        <label className="block text-label uppercase tracking-label text-muted mb-1.5 font-semibold">
                          Note <span className="text-muted font-normal">(Optional)</span>
                        </label>
                        <textarea
                          rows={3}
                          aria-label="Note for the couple" maxLength={2000}
                          value={reportNote}
                          onChange={(e) => setReportNote(e.target.value)}
                          placeholder="Write a personal note for Alexis & Kelsey..."
                          className="w-full border border-line p-3 text-base bg-surface rounded-sm outline-none focus:border-action resize-none transition-colors"
                        />
                        <p className="text-caption font-sans text-muted italic flex items-center gap-1.5 pt-1.5">
                          <ShieldCheck size={14} className="text-success shrink-0" />
                          <span>Your gift amount and note are kept strictly private between you and the couple.</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="w-full h-12 font-sans text-xs uppercase tracking-label bg-action text-cream rounded-sm hover:bg-action-hover transition-colors font-semibold shadow-card flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
                </form>
              )}
            </div>
          </div>

        </div>

        {/* Footer Alternative Link */}
        <div className="pt-8 border-t border-line text-center">
          <p className="text-copy font-sans text-charcoal/80">
            Looking for our curated home & physical gift registry?{" "}
            <Link
              href="/registry/items"
              className="font-semibold text-action hover:underline inline-flex items-center gap-1"
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
