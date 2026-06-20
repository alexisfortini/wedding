-- ============================================================================
-- Alexis & Kelsey's Wedding Database Schema
-- Run this in your Supabase SQL Editor to set up the tables and default data.
-- ============================================================================

-- 1. Parties table (holds households / couples for grouped RSVP lookup)
CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Guests table
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
  address TEXT,
  rsvp_status VARCHAR(50) DEFAULT 'pending', -- 'attending', 'declined', 'pending'
  notes TEXT,
  is_plus_one BOOLEAN DEFAULT false,
  parent_guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  plus_ones_allowed INTEGER DEFAULT 0,
  age VARCHAR(50) DEFAULT 'Adult',
  needs_highchair BOOLEAN DEFAULT false,
  in_wheelchair BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Groups table (tags/lists for private event visibility)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Guest Groups mapping table (junction table)
CREATE TABLE IF NOT EXISTS guest_groups (
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (guest_id, group_id)
);

-- 5. Events table (public or group-restricted events)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location VARCHAR(255) NOT NULL,
  dress_code VARCHAR(255),
  is_public BOOLEAN DEFAULT true,
  needs_rsvp BOOLEAN DEFAULT true,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL, -- Null if public, set to group for private visibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Guest Events RSVP status tracking table (junction table)
CREATE TABLE IF NOT EXISTS guest_events (
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  is_attending BOOLEAN,
  meal_choice VARCHAR(255),
  dietary_restrictions TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (guest_id, event_id)
);

-- ============================================================================
-- SEED DEFAULT DATA
-- ============================================================================

-- Seed default parties
INSERT INTO parties (id, name) 
VALUES 
  ('c3b4a2a1-1234-5678-90ab-cdef01234567', 'Alexis Fortini & Kelsey Hartfelder'),
  ('d4b5c6a7-1234-5678-90ab-cdef01234568', 'Gayle & Jack Hartfelder'),
  ('e5b6c7a8-1234-5678-90ab-cdef01234569', 'Nadia & Christian Fortini')
ON CONFLICT DO NOTHING;

-- Seed default guests
INSERT INTO guests (id, first_name, last_name, email, party_id)
VALUES 
  ('a1b2c3d4-5678-90ab-cdef-0123456789ab', 'Alexis', 'Fortini', 'axs.fortini@gmail.com', 'c3b4a2a1-1234-5678-90ab-cdef01234567'),
  ('b2c3d4e5-6789-01ab-cdef-23456789abcd', 'Kelsey', 'Hartfelder', 'kelsey.hartfelder@gmail.com', 'c3b4a2a1-1234-5678-90ab-cdef01234567'),
  ('c3d4e5f6-7890-12ab-cdef-3456789abcde', 'Gayle', 'Hartfelder', 'gayle.hartfelder@gmail.com', 'd4b5c6a7-1234-5678-90ab-cdef01234568'),
  ('d4e5f6a7-8901-23ab-cdef-456789abcdef', 'Jack', 'Hartfelder', 'jack.hartfelder@gmail.com', 'd4b5c6a7-1234-5678-90ab-cdef01234568'),
  ('e5f6a7b8-9012-34ab-cdef-56789abcdef0', 'Nadia', 'Fortini', 'nadia.fortini@gmail.com', 'e5b6c7a8-1234-5678-90ab-cdef01234569'),
  ('f6a7b8c9-0123-45ab-cdef-6789abcdef01', 'Christian', 'Fortini', 'christian.fortini@gmail.com', 'e5b6c7a8-1234-5678-90ab-cdef01234569')
ON CONFLICT DO NOTHING;

-- Seed default groups
INSERT INTO groups (id, name)
VALUES 
  ('e1a2b3c4-d5e6-7890-1234-56789abcdef0', 'Bachelor Party'),
  ('f2b3c4d5-e6f7-8901-2345-6789abcdef01', 'Bridal Party'),
  ('00000000-0000-0000-0000-00000000000a', 'Admin'),
  ('00000000-0000-0000-0000-00000000000e', 'Estate')
ON CONFLICT (name) DO NOTHING;

-- Map Alexis to the Bachelor Party group
INSERT INTO guest_groups (guest_id, group_id)
VALUES ('a1b2c3d4-5678-90ab-cdef-0123456789ab', 'e1a2b3c4-d5e6-7890-1234-56789abcdef0')
ON CONFLICT DO NOTHING;

-- Map Kelsey to the Bridal Party group
INSERT INTO guest_groups (guest_id, group_id)
VALUES 
  ('b2c3d4e5-6789-01ab-cdef-23456789abcd', 'f2b3c4d5-e6f7-8901-2345-6789abcdef01')
ON CONFLICT DO NOTHING;

-- Map Admins to the Admin Group
INSERT INTO guest_groups (guest_id, group_id)
VALUES 
  ('a1b2c3d4-5678-90ab-cdef-0123456789ab', '00000000-0000-0000-0000-00000000000a'),
  ('b2c3d4e5-6789-01ab-cdef-23456789abcd', '00000000-0000-0000-0000-00000000000a'),
  ('c3d4e5f6-7890-12ab-cdef-3456789abcde', '00000000-0000-0000-0000-00000000000a'),
  ('d4e5f6a7-8901-23ab-cdef-456789abcdef', '00000000-0000-0000-0000-00000000000a'),
  ('e5f6a7b8-9012-34ab-cdef-56789abcdef0', '00000000-0000-0000-0000-00000000000a'),
  ('f6a7b8c9-0123-45ab-cdef-6789abcdef01', '00000000-0000-0000-0000-00000000000a')
ON CONFLICT DO NOTHING;

-- Seed default events (Base/Public Events)
INSERT INTO events (id, title, description, date, start_time, end_time, location, dress_code, is_public, group_id)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Welcome Soirée',
    'Kick off the weekend with drinks and light bites poolside.',
    '2027-04-02',
    '18:00:00',
    '22:00:00',
    'The Estate Poolside',
    'Desert Chic: Light summer fabrics, linens, sandals or block heels.',
    true,
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'The Ceremony & Celebration',
    'Our vows under the desert palms, followed by dinner, drinks, and Kelsey''s midnight soup bar tribute.',
    '2027-04-03',
    '16:30:00',
    '23:00:00',
    'The Bougainvillea Gardens',
    'Desert Formal: Neutral earth tones, elegant midi or maxi dresses, suits or sport coats (no ties required).',
    true,
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Day-After Pool Brunch',
    'Recover and lounge poolside with breakfast burritos and mimosas.',
    '2027-04-04',
    '11:00:00',
    '14:00:00',
    'The Estate Lawn',
    'Pool Casual: Swimwear encouraged, cover-ups, shorts, t-shirts.',
    true,
    NULL
  )
ON CONFLICT DO NOTHING;

-- Seed private events (Bachelor Party, Bridal Party, Rehearsal Dinner)
INSERT INTO events (id, title, description, date, start_time, end_time, location, dress_code, is_public, group_id)
VALUES
  (
    '00000000-0000-0000-0000-000000000004',
    'Bachelor Golf & Cigars',
    'Tee off at PGA West for a round of golf, cigars, and drinks.',
    '2027-04-15', -- Thursday before the wedding weekend
    '12:00:00',
    '17:00:00',
    'Pete Dye Stadium Course',
    'Golf Attire: Collared shirts, golf shorts/slacks, soft spikes.',
    false,
    'e1a2b3c4-d5e6-7890-1234-56789abcdef0' -- Bachelor Party Group ID
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Bachelor Night Out',
    'Dinner, craft beers, and stories in downtown Palm Springs.',
    '2027-04-15',
    '20:00:00',
    '02:00:00',
    'Downtown Palm Springs',
    'Casual: Comfortable clothes for moving around.',
    false,
    'e1a2b3c4-d5e6-7890-1234-56789abcdef0' -- Bachelor Party Group ID
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Bridal Party Champagne Brunch',
    'Mimosas, fruit plattters, and bridal styling tips before the welcome soirée.',
    '2027-04-16',
    '10:30:00',
    '13:00:00',
    'Lavender Bistro',
    'Garden Cocktail: Light-colored sundresses or daytime attire.',
    false,
    'f2b3c4d5-e6f7-8901-2345-6789abcdef01' -- Bridal Party Group ID
  )
ON CONFLICT DO NOTHING;

-- Initialize guest_events links for RSVP tracking for Alexis, Kelsey, Gayle, Jack, Nadia, and Christian
INSERT INTO guest_events (guest_id, event_id)
VALUES
  ('a1b2c3d4-5678-90ab-cdef-0123456789ab', '00000000-0000-0000-0000-000000000001'),
  ('a1b2c3d4-5678-90ab-cdef-0123456789ab', '00000000-0000-0000-0000-000000000002'),
  ('a1b2c3d4-5678-90ab-cdef-0123456789ab', '00000000-0000-0000-0000-000000000003'),
  ('a1b2c3d4-5678-90ab-cdef-0123456789ab', '00000000-0000-0000-0000-000000000004'),
  ('a1b2c3d4-5678-90ab-cdef-0123456789ab', '00000000-0000-0000-0000-000000000005'),
  
  ('b2c3d4e5-6789-01ab-cdef-23456789abcd', '00000000-0000-0000-0000-000000000001'),
  ('b2c3d4e5-6789-01ab-cdef-23456789abcd', '00000000-0000-0000-0000-000000000002'),
  ('b2c3d4e5-6789-01ab-cdef-23456789abcd', '00000000-0000-0000-0000-000000000003'),
  ('b2c3d4e5-6789-01ab-cdef-23456789abcd', '00000000-0000-0000-0000-000000000006'),

  ('c3d4e5f6-7890-12ab-cdef-3456789abcde', '00000000-0000-0000-0000-000000000001'),
  ('c3d4e5f6-7890-12ab-cdef-3456789abcde', '00000000-0000-0000-0000-000000000002'),
  ('c3d4e5f6-7890-12ab-cdef-3456789abcde', '00000000-0000-0000-0000-000000000003'),

  ('d4e5f6a7-8901-23ab-cdef-456789abcdef', '00000000-0000-0000-0000-000000000001'),
  ('d4e5f6a7-8901-23ab-cdef-456789abcdef', '00000000-0000-0000-0000-000000000002'),
  ('d4e5f6a7-8901-23ab-cdef-456789abcdef', '00000000-0000-0000-0000-000000000003'),

  ('e5f6a7b8-9012-34ab-cdef-56789abcdef0', '00000000-0000-0000-0000-000000000001'),
  ('e5f6a7b8-9012-34ab-cdef-56789abcdef0', '00000000-0000-0000-0000-000000000002'),
  ('e5f6a7b8-9012-34ab-cdef-56789abcdef0', '00000000-0000-0000-0000-000000000003'),

  ('f6a7b8c9-0123-45ab-cdef-6789abcdef01', '00000000-0000-0000-0000-000000000001'),
  ('f6a7b8c9-0123-45ab-cdef-6789abcdef01', '00000000-0000-0000-0000-000000000002'),
  ('f6a7b8c9-0123-45ab-cdef-6789abcdef01', '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;
