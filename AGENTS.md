<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wedding Website AI Agent Guidelines

Welcome, Agent. This document outlines the architecture, database constraints, deployment rules, and configuration patterns of this project. Read this before making changes to prevent data loss or layout errors.

---

## 🚨 Critical Rules & Constraints

1. **NO AUTOMATIC DEPLOYMENTS**:
   * Do **NOT** run `./scripts/deploy.sh` automatically when configuration or code changes.
   * **Always ask** the user for explicit approval before initiating a cloud deployment.
2. **Supabase is the Single Source of Truth**:
   * Guest, party, and event RSVP statuses are queried and updated live in the Supabase database.
   * Never fall back to local browser caches or LocalStorage for primary storage.
3. **Deploy Config Upload (`.gcloudignore`)**:
   * The `/config/` folder contains essential files like `general.json` (Alexis & Kelsey's names and date).
   * We use a customized `.gcloudignore` to **override** `.gitignore` and upload `/config/` to Google Cloud Build.
   * Do **NOT** add `/config/` to `.gcloudignore` or modify `.gcloudignore` without explicit instructions, otherwise the website will build with default "Groom & Bride" placeholders.
4. **Deploy and Git Push Together**:
   * Whenever a deployment is approved by the user, always commit and push the source code changes to the git repository alongside running `./scripts/deploy.sh` to ensure git history and the live build remain synchronized.

---

## 🛠️ Project Architecture

### 1. Configurations (`/config/`)
* **Layout & Static Data**: `general.json`, `story.json`, `faq.json`, `registry.json`, `travel.json`, `map.json`.
  * These files are imported via ES modules (e.g. `import generalConfig from "@config/general.json";`) and are baked into the JavaScript bundle at build-time.
  * Modifying these files updates the UI locally instantly, but requires a user-approved deployment to update the live website.
* **Database Seeds**: `guests.json`, `groups.json`, `events.json`.
  * These are seed lists. When deployed, you must log into the `/admin` portal as an administrator (`Alexis Fortini`) and click **Reset to JSON Seeds** on the **Backups** tab to sync these lists to Supabase.

### 2. Database Structure (Supabase)
* **Tables**:
  * `guests`: RSVP statuses, notes, dietary requirements, and mailing addresses.
  * `parties`: Guest household groupings (linked to guests via `party_id`).
  * `groups`: Restricted-access segment lists (e.g. "Estate", "Bachelor Party", "Bridal Party").
  * `guest_groups`: Junction table linking guests to visibility groups.
  * `events`: Event dates, locations, and descriptions (linked to RLS groups via `group_id`).
  * `guest_events`: Junction table tracking RSVPs for specific events.
* **Security & Keys**:
  * Public client: uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (RLS blocks inserts to groups/guests unless authenticated).
  * Server-side/Admin scripts: use `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` to bypass RLS.

### 3. Key Components
* **[GuestGate.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/GuestGate.tsx)**: Main login landing page. Validates guest names case-insensitively against the Supabase database.
* **[TheWeekend.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/TheWeekend.tsx)**: Displays the timeline events. Includes a click-to-toggle popover tooltip for dress code details (checks if the dress code string contains a `:` to parse details).
* **[admin/page.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/app/admin/page.tsx)**: Secure admin portal. Admin credentials list is configured in `config/admin.json`.
* **[aislePlannerExporter.ts](file:///Users/alexisfortini/Documents/Python/Wedding/src/lib/aislePlannerExporter.ts)**: Serializes guest and party lists into clean CSV files formatted for direct upload into **Aisle Planner**.
