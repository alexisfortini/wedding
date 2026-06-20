# Reorganization Task List

- `[x]` Reorganize config and setup scripts
  - `[x]` Create `config/` and `config.default/` directories
  - `[x]` Create `weddingDetails.json` and its template
  - `[x]` Create `groups.json` and its template
  - `[x]` Create `events.json` and its template
  - `[x]` Create `guests.json` and its template
  - `[x]` Create `scripts/setup-config.js`
  - `[x]` Modify project files (`.gitignore`, `tsconfig.json`, `package.json`, `next.config.ts`)
- `[x]` Refactor data & components
  - `[x]` Refactor `src/lib/mockDatabase.ts` to load from JSON configs
  - `[x]` Refactor UI components:
    - `[x]` `Hero.tsx`
    - `[x]` `FAQ.tsx`
    - `[x]` `Registry.tsx`
    - `[x]` `OurStory.tsx`
    - `[x]` `RestAndRecharge.tsx`
    - `[x]` `DJLineup.tsx`
    - `[x]` `MapSection.tsx`
    - `[x]` `GuestGate.tsx`
    - `[x]` `admin/page.tsx`
- `[x]` Verification
  - `[x]` Run production build and verify complete functionality

## RSVP Form Empty State Fix
- `[x]` Diagnose root cause of empty/blank RSVP form (outdated `party_id` in localStorage after splits)
- `[x]` Implement background fresh guest query in `GuestGate.tsx` to keep client in sync with database updates
- `[x]` Add defensive query check in `RSVPForm.tsx` to retrieve fresh guest info before loading household members
- `[x]` Pre-populate `is_attending` state from `rsvp_status` values instead of resetting to null
- `[x]` Remove redundant Attending/Declining buttons from the plus-one credentials panel
- `[x]` Run build locally to confirm compilation success

## RLS Security, RSVP Deadline, and Gallery Controls (June 2026)
- [x] Add `rsvp_deadline_message` to general.json configurations (default and local)
- [x] Add editable RSVP deadline field under General Settings in `src/app/admin/page.tsx`
- [x] Render dynamic RSVP deadline message in `src/components/RSVPForm.tsx`
- [x] Create default config `gallery.json` for hidden photos list
- [x] Support gallery config sync in `download_data.js`
- [x] Implement admin detection, edit toggling, and visibility controls in `src/components/GalleryGrid.tsx`
- [x] Verify build check succeeds
- [x] Commit and push changes to remote
