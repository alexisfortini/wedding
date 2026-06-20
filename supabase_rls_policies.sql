-- ============================================================================
-- Supabase Row-Level Security (RLS) Policy Setup
-- Copy and run this script in your Supabase SQL Editor (https://supabase.com)
-- to secure your tables from unauthorized access while keeping the app working.
-- ============================================================================

-- 1. Parties Table
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on parties" ON parties;
CREATE POLICY "Allow public select on parties" ON parties FOR SELECT USING (true);

-- 2. Guests Table
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on guests" ON guests;
DROP POLICY IF EXISTS "Allow public insert on guests" ON guests;
DROP POLICY IF EXISTS "Allow public update on guests" ON guests;
DROP POLICY IF EXISTS "Allow public delete on guests" ON guests;

CREATE POLICY "Allow public select on guests" ON guests FOR SELECT USING (true);
CREATE POLICY "Allow public insert on guests" ON guests FOR INSERT WITH CHECK (is_plus_one = true);
CREATE POLICY "Allow public update on guests" ON guests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on guests" ON guests FOR DELETE USING (is_plus_one = true);

-- 3. Groups Table
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on groups" ON groups;
CREATE POLICY "Allow public select on groups" ON groups FOR SELECT USING (true);

-- 4. Guest Groups Table
ALTER TABLE guest_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on guest_groups" ON guest_groups;
CREATE POLICY "Allow public select on guest_groups" ON guest_groups FOR SELECT USING (true);

-- 5. Events Table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on events" ON events;
CREATE POLICY "Allow public select on events" ON events FOR SELECT USING (true);

-- 6. Guest Events Table
ALTER TABLE guest_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select on guest_events" ON guest_events;
DROP POLICY IF EXISTS "Allow public insert on guest_events" ON guest_events;
DROP POLICY IF EXISTS "Allow public update on guest_events" ON guest_events;

CREATE POLICY "Allow public select on guest_events" ON guest_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert on guest_events" ON guest_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on guest_events" ON guest_events FOR UPDATE USING (true) WITH CHECK (true);

-- Note: 'site_configs' is already RLS-enabled and secure.
