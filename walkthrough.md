# Reorganization: Centralized Text & Data Configurations

We have successfully reorganized the entire codebase to store all static text, schedule events, custom groups, travel logistics, map markers, FAQs, and guest seeds inside a neat, easy-to-edit configuration folder in the root of the repository. The real configuration files are completely `.gitignored` to allow publishing code to a public repository with generic templates checked into Git.

---

## 📂 Reorganized Repository Architecture

We introduced a logical configuration layer in the root directory:
```
wedding/
  ├── config/                 <-- (Gitignored) Real editable JSON data
  │   ├── weddingDetails.json <-- Texts, stories, travel cards, map coordinates, admins
  │   ├── groups.json         <-- Array of configurable groups (e.g. Bridal Party)
  │   ├── events.json         <-- Core events schedule and group links
  │   └── guests.json         <-- Household parties & guest details
  ├── config.default/         <-- Checked-in generic templates for public repo
  │   ├── weddingDetails.json
  │   ├── groups.json
  │   ├── events.json
  │   └── guests.json
  ├── scripts/
  │   └── setup-config.js     <-- Automatically creates /config if missing from checkout
  ├── src/
  │   ├── app/
  │   ├── components/
  │   └── lib/
  ...
```

---

## 🛠️ Key Implementation Steps

### 1. Reorganization Scripts & Build Pipeline Integration
- **Setup Script**: Created [setup-config.js](file:///Users/alexisfortini/Documents/Python/Wedding/scripts/setup-config.js) which copies files from `config.default/` to `config/` if the latter is absent.
- **Next Config Integration**: Modified [next.config.ts](file:///Users/alexisfortini/Documents/Python/Wedding/next.config.ts) to execute `setup-config.js` synchronously during startup. This guarantees `config/` exists during any Next.js runtime (e.g. running `next dev` directly).
- **Package scripts**: Wired `node scripts/setup-config.js` to `predev` and `prebuild` in [package.json](file:///Users/alexisfortini/Documents/Python/Wedding/package.json).
- **TypeScript Import Path Alias**: Configured `@config/*` mapping inside [tsconfig.json](file:///Users/alexisfortini/Documents/Python/Wedding/tsconfig.json) for clean relative imports.
- **Git Protection**: Added `/config/` to [.gitignore](file:///Users/alexisfortini/Documents/Python/Wedding/.gitignore) to keep personal emails, phone numbers, and passcodes out of public checkins.

### 2. Mock Database Seeds Upgrade
- Refactored [mockDatabase.ts](file:///Users/alexisfortini/Documents/Python/Wedding/src/lib/mockDatabase.ts):
  - Removed all hardcoded static data arrays.
  - Dynamically loads initial seeds from `guests.json`, `groups.json`, and `events.json`.
  - Added a deterministic UUID helper `getDeterministicUUID(name)` to assign stable UUIDs to parties, guests, groups, and events.
  - Automatically handles matching private events to guests' assigned groups, making the local mock database completely self-repairing when new guests or groups are configured.

### 3. Dynamic Text & Layout Components
We refactored all frontend UI blocks to import configurations from `@config/weddingDetails.json` instead of utilizing hardcoded strings:
- **Hero / Welcome Gate**: Dynamic names, invitation subtitles, locations, and dates inside [Hero.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/Hero.tsx) and [GuestGate.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/GuestGate.tsx).
- **Weekend / DJ Schedule**: Loaded names, description text, set lineups, and events inside [TheWeekend.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/TheWeekend.tsx) and [DJLineup.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/DJLineup.tsx).
- **Our Story / FAQs / Registry**: Feeds chronological timeline slides, toggles, external registry addresses, and descriptions dynamically inside [OurStory.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/OurStory.tsx), [FAQ.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/FAQ.tsx), and [Registry.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/Registry.tsx).
- **Travel Cards / Maps**: Dynamically lists airport lists, hotel booking URLs, recommendations, and Mapbox map points in [RestAndRecharge.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/RestAndRecharge.tsx) and [MapSection.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/MapSection.tsx).
- **Admin Dashboard**: Loads administrative passcode verification gate and administrator username whitelist dynamically from the JSON file in [admin/page.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/app/admin/page.tsx).

---

## 🧪 Verification & Build Results

1. **Local Execution**: The website runs and compiles correctly locally.
2. **Setup Verification**:
   - Deleted `/config` directory.
   - Ran `npm run build`.
   - Setup script detected missing folder and successfully recreated it:
     ```
     > polar-corona@0.1.0 prebuild
     > node scripts/setup-config.js

     config/ directory not found. Creating from config.default/ template...
     config/ directory initialized successfully.
     ```
3. **Production Compilation**:
   Next.js compiles and optimizes all routes successfully without any type checking issues:
   ```bash
   ▲ Next.js 16.2.1 (Turbopack)
   - Environments: .env.local

     Creating an optimized production build ...
   ✓ Compiled successfully in 2.8s
     Running TypeScript ...
     Finished TypeScript in 2.3s ...
     Collecting page data using 9 workers ...
     Generating static pages using 9 workers (8/8) in 307ms
     Finalizing page optimization ...
   ```
