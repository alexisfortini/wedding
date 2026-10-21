import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giftStatus, giftPrice, publicRegistry } from '../src/lib/registry.ts';

test('partial retailer quantities do not falsely complete a gift', () => {
  assert.equal(giftStatus({ quantity_requested: 2, quantity_purchased: 1 }), 'available');
  assert.equal(giftStatus({ quantity_requested: 2, quantity_purchased: 2 }), 'purchased');
});
test('guest reports remain separate from confirmed retailer purchases', () => {
  assert.equal(giftStatus({ guest_reported_quantity: 1 }), 'reported');
  assert.equal(giftStatus({ is_purchased: true, purchase_source: 'guest' }), 'reported');
  assert.equal(giftStatus({ is_purchased: true, purchase_source: 'admin' }), 'purchased');
});
test('out of stock is not a purchase and does not hide confirmed gifts', () => {
  assert.equal(giftStatus({ stock_status: 'out_of_stock' }), 'unavailable');
  assert.equal(giftStatus({ stock_status: 'out_of_stock', quantity_purchased: 1 }), 'purchased');
});
test('public catalog and claim responses exclude donor identities and private notes', () => {
  const result = publicRegistry({ title: 'Registry', vendor_actions: ['private'], items: [
    { id: 'gift', purchased_by: 'Private Guest', purchased_note: 'Private note', guest_reports: [{ name: 'Private Guest' }], quantity_purchased: 1 },
  ] });
  assert.equal(result.items[0].quantity_purchased, 1);
  assert.ok(!JSON.stringify(result).includes('Private'));
  assert.ok(!('vendor_actions' in result));
});
test('price filters handle formatted amounts and omit gifts with no numeric price', () => {
  assert.equal(giftPrice({ price: '$1,249.95' }), 1249.95);
  assert.equal(giftPrice({ price: 'Price on request' }), null);
});
