"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RegistryGift, RegistryStore, giftStatus } from "@/lib/registry";

type Catalog = { stores: RegistryStore[]; items: (RegistryGift & { purchased_by?: string; guest_reports?: { name: string; note?: string; at: string }[] })[] };

export default function RegistryAdminPage() {
  const [passcode, setPasscode] = useState("");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, { requested: number; purchased: number; resolve: boolean }>>({});
  const [observedAt, setObservedAt] = useState("");

  const load = useCallback(async (code: string) => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/registry/sync", { headers: { "x-admin-passcode": code }, cache: "no-store", signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to load registry.");
      setCatalog(data.value);
      setQuantities(Object.fromEntries(data.value.items.map((item: RegistryGift) => [item.id, { requested: item.quantity_requested ?? 1, purchased: item.quantity_purchased ?? (item.is_purchased ? 1 : 0), resolve: false }])));
      sessionStorage.setItem("wedding_admin_passcode", code);
    } catch (error) { setCatalog(null); setMessage(error instanceof Error ? error.message : "Unable to load registry."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { const code = sessionStorage.getItem("wedding_admin_passcode"); if (code) { setPasscode(code); load(code); } }, [load]);

  async function reconcile(storeId: string) {
    if (!catalog || !observedAt) { setMessage("Enter when you checked the store registry before saving quantities."); return; }
    setBusy(true); setMessage("");
    try {
      const items = catalog.items.filter(item => item.store_id === storeId && item.registry_added).map(item => ({ id: item.id,
        requested: quantities[item.id].requested, purchased: quantities[item.id].purchased, resolveGuestReport: quantities[item.id].resolve }));
      const response = await fetch("/api/registry/sync", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
        body: JSON.stringify({ storeId, observedAt: new Date(observedAt).toISOString(), items }), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Unable to save quantities.");
      setCatalog(data.value);
      setQuantities(Object.fromEntries(data.value.items.map((item: RegistryGift) => [item.id, { requested: item.quantity_requested ?? 1, purchased: item.quantity_purchased ?? 0, resolve: false }])));
      setMessage("Verified quantities saved to Supabase. No changes were made to the store registry.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save quantities."); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-cream text-charcoal p-5 md:p-12"><div className="max-w-6xl mx-auto space-y-7">
    <Link href="/admin" className="text-action underline">Back to admin portal</Link>
    <h1 className="font-serif text-4xl">Registry Connections</h1>
    <p className="max-w-3xl text-muted">Manage the seven store registries and reconcile gift reports. Retailer purchase updates require checking the store. Automatic two-way sync is not connected.</p>
    {!catalog && <form onSubmit={e => { e.preventDefault(); load(passcode); }} className="flex gap-3 flex-wrap"><input aria-label="Admin passcode" type="password" autoComplete="current-password" value={passcode} onChange={e => setPasscode(e.target.value)} className="p-3 border border-line bg-surface rounded-sm" /><button disabled={busy} className="p-3 bg-action text-cream rounded-sm">{busy ? "Loading…" : "Sign in"}</button></form>}
    {message && <p role="status" className="p-4 border border-line bg-surface rounded-sm">{message}</p>}
    {catalog && <>
      <div className="flex items-end justify-between gap-4 flex-wrap"><label>When did you check the store?<input aria-label="Retailer observation time" type="datetime-local" value={observedAt} onChange={e => setObservedAt(e.target.value)} className="block p-3 border border-line bg-surface rounded-sm mt-2" /></label><button disabled={busy} onClick={() => load(passcode)} className="p-3 border border-line rounded-sm">Reload from Supabase</button></div>
      <div className="grid md:grid-cols-2 gap-5">{catalog.stores.map(store => {
        const items = catalog.items.filter(item => item.store_id === store.id);
        return <section key={store.id} className="bg-surface border border-line rounded-sm p-5 space-y-4">
          <h2 className="font-serif text-2xl">{store.name}</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm"><dt>Visibility</dt><dd>{store.visibility_status || "Needs verification"}</dd><dt>Kelsey’s access</dt><dd>{store.partner_status || "Needs verification"}</dd><dt>Cover photo</dt><dd>{store.photo_status || "Not verified"}</dd><dt>Connection</dt><dd>Manual reconciliation</dd></dl>
          <p className="italic text-muted">{store.guest_note}</p>
          {store.url && <a href={store.url} target="_blank" rel="noreferrer" className="inline-block text-action underline">Open store registry</a>}
          {items.map(item => <div key={item.id} className="border-t border-line pt-4 space-y-2">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-muted">{item.registry_added ? "Added to store registry" : "Gift idea · store registration pending"} · {giftStatus(item) === "reported" ? "Guest report needs reconciliation" : giftStatus(item)}</p>
            {item.purchased_by && <p className="text-sm">Guest: {item.purchased_by}</p>}
            {item.vendor_verified_at && <p className="text-sm text-muted">Store checked: {new Date(item.vendor_verified_at).toLocaleString()}</p>}
            {item.registry_added && <><div className="flex gap-3"><label className="text-sm">Requested<input aria-label={`Requested: ${item.title}`} type="number" min="1" max="1000" value={quantities[item.id]?.requested ?? 1} onChange={e => setQuantities(prev => ({ ...prev, [item.id]: { ...prev[item.id], requested: Number(e.target.value) } }))} className="block p-2 w-24 border border-line rounded-sm" /></label><label className="text-sm">Purchased at store<input aria-label={`Purchased: ${item.title}`} type="number" min="0" max="1000" value={quantities[item.id]?.purchased ?? 0} onChange={e => setQuantities(prev => ({ ...prev, [item.id]: { ...prev[item.id], purchased: Number(e.target.value) } }))} className="block p-2 w-24 border border-line rounded-sm" /></label></div>
            {!!item.guest_reported_quantity && <label className="flex gap-2 text-sm"><input type="checkbox" checked={quantities[item.id]?.resolve || false} onChange={e => setQuantities(prev => ({ ...prev, [item.id]: { ...prev[item.id], resolve: e.target.checked } }))} />I reconciled this guest report with the retailer</label>}</>}
          </div>)}
          {items.some(item => item.registry_added) && <button disabled={busy} onClick={() => reconcile(store.id)} className="p-3 bg-action text-cream rounded-sm disabled:opacity-50">Save observed quantities</button>}
        </section>;
      })}</div>
      <section className="p-5 bg-surface border border-line rounded-sm space-y-3"><h2 className="font-serif text-2xl">Gifts from other shops</h2><p className="text-muted">Original products that need a separate registry or a direct gift link. Use Registry Settings in the main admin portal to confirm these purchases.</p>{catalog.items.filter(item => !item.store_id).map(item => <div key={item.id} className="border-t border-line pt-3 space-y-1"><p><a className="text-action underline" target="_blank" rel="noreferrer" href={item.item_url}>{item.title}</a> — {item.store_name}</p><p className="text-sm text-muted">{item.enabled === false ? "Hidden from guests" : giftStatus(item)}{item.guest_reported_quantity ? ` · ${item.guest_reported_quantity} guest report(s)` : ""}</p>{item.setup_note && <p className="text-sm text-muted">{item.setup_note}</p>}{item.guest_reports?.map((report, index) => <p key={index} className="text-sm">Reported by {report.name} on {new Date(report.at).toLocaleDateString()}{report.note ? `: ${report.note}` : ""}</p>)}</div>)}</section>
    </>}
  </div></main>;
}
