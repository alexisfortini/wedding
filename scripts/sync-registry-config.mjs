import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
if (!url || !key) throw new Error('Supabase URL and service-role key are required.');
const desired = JSON.parse(fs.readFileSync('config/ui/registry.json', 'utf8'));
if (!Array.isArray(desired.items) || !Array.isArray(desired.stores)) throw new Error('Registry configuration is incomplete.');
const ids = desired.items.map(item => item.id);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate registry gift IDs.');
for (const item of desired.items) {
  if (!item.item_url || new URL(item.item_url).protocol !== 'https:') throw new Error(`Invalid product link: ${item.id}`);
  if (item.enabled !== false && !item.image_url) throw new Error(`Product image missing: ${item.id}`);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: row, error: readError } = await db.from('site_configs').select('value,updated_at').eq('key', 'registry').maybeSingle();
if (readError) throw readError;
const current = row?.value ?? {};
const volatileFields = ['is_purchased','purchased_by','purchased_note','purchased_at','guest_reports','guest_reported_quantity','quantity_purchased','quantity_requested','purchase_source','vendor_verified_at','enabled'];
const items = desired.items.map(item => {
  const previous = current.items?.find(old => old.id === item.id);
  if (!previous) return item;
  return { ...item, ...Object.fromEntries(volatileFields.filter(field => field in previous).map(field => [field, previous[field]])) };
});
// Preserve live gifts not part of this import, including any guest reports.
for (const item of current.items ?? []) if (!ids.includes(item.id)) items.push(item);
const stores = [...desired.stores];
for (const store of current.stores ?? []) if (!stores.some(entry => entry.id === store.id)) stores.push(store);
const value = { ...desired, ...current, items, stores, sync_mode: 'manual_reconciliation' };
const summary = { mode: process.argv.includes('--apply') ? 'apply' : 'preview', stores: stores.length,
  gifts: items.length, enabled: items.filter(item => item.enabled !== false).length,
  registered: items.filter(item => item.registry_added).length,
  preservedReports: items.filter(item => item.is_purchased || item.guest_reported_quantity).length };
console.log(JSON.stringify(summary));
if (!process.argv.includes('--apply')) process.exit(0);
fs.mkdirSync('database_backups', { recursive: true });
const stamp = new Date().toISOString().replaceAll(':','-');
const backup = path.join('database_backups', `registry-${stamp}.json`);
fs.writeFileSync(backup, JSON.stringify(row, null, 2));
const payload = { key: 'registry', value, updated_at: new Date().toISOString() };
let write;
if (row) {
  let query = db.from('site_configs').update(payload).eq('key', 'registry');
  query = row.updated_at ? query.eq('updated_at', row.updated_at) : query.is('updated_at', null);
  write = await query.select('key');
}
else write = await db.from('site_configs').insert(payload).select('key');
if (write.error) throw write.error;
if (!write.data?.length) throw new Error('Registry changed during import. Nothing was overwritten; preview again.');
const { data: verified, error: verifyError } = await db.from('site_configs').select('value').eq('key','registry').single();
if (verifyError) throw verifyError;
if (JSON.stringify(verified.value) !== JSON.stringify(value)) {
  // JSONB reorders object keys; compare meaningful records instead of key order.
  for (const item of value.items) if (!verified.value.items.some(entry => entry.id === item.id && entry.item_url === item.item_url && entry.is_purchased === item.is_purchased)) throw new Error('Registry readback did not match the import.');
}
console.log('Registry saved and verified. Backup: ' + backup);
