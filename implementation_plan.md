# Migrate All Text, Configurable Groups, and Guest Seeds to Gitignored JSON Folder

We will move all static texts, configurable groups, timeline entries, FAQs, travel cards, registry details, maps, and admin credentials into a central, easy-to-edit configuration folder `config/` in the root of the repository. We will check in a `config.default/` folder with generic placeholders for public repo publication and configure a setup script that ensures the build works flawlessly on a fresh clone.

## User Review Required

> [!IMPORTANT]
> **Structure of Configs**: The new configurations are formatted in easy-to-read JSON files under `/config/` in the root directory. You can edit them using any basic text editor.
>
> **Git Protection**: The `/config/` directory is added to `.gitignore`. The template files in `/config.default/` are checked in with generic placeholders (e.g. John Doe, Jane Doe, Admin passcode: admin123). On your local repository, your actual wedding details (Alexis & Kelsey, Indio CA, passcode: indio2027) will be preserved in `/config/` so you don't lose any data.
>
> **Setup Script**: A new script `scripts/setup-config.js` will run automatically during `dev` and `build` (and synchronously inside `next.config.ts`) to ensure `/config/` is created from `/config.default/` if it is missing in a fresh checkout.

## Open Questions

> [!NOTE]
> None. The requirements are fully detailed.

---

## Proposed Changes

### Configuration Folder

#### [NEW] [weddingDetails.json](file:///Users/alexisfortini/Documents/Python/Wedding/config/weddingDetails.json)
Contains all basic text on the website:
- Partner names (Partner 1 & Partner 2)
- Event date & raw calculation date
- Venue and location details
- Invite messages, buttons, and prompts
- Admin validation names list and admin passcode
- Timeline stories, FAQs, registry, travel recommendations, maps, and DJ lineup schedules

#### [NEW] [groups.json](file:///Users/alexisfortini/Documents/Python/Wedding/config/groups.json)
Contains a simple array list of configurable groups (e.g. Bachelor Party, Bridal Party, Rehearsal Dinner, Admin).

#### [NEW] [events.json](file:///Users/alexisfortini/Documents/Python/Wedding/config/events.json)
Contains the default schedule of events (both public and private, referencing group names).

#### [NEW] [guests.json](file:///Users/alexisfortini/Documents/Python/Wedding/config/guests.json)
Contains a clean list of households/parties with their guest names, emails, phones, and assigned group tags, hiding complex UUIDs.

#### [NEW] [config.default/](file:///Users/alexisfortini/Documents/Python/Wedding/config.default)
Checked-in generic templates of `weddingDetails.json`, `groups.json`, `events.json`, and `guests.json` using generic mock placeholders.

---

### Project Build & Dependency Configs

#### [NEW] [setup-config.js](file:///Users/alexisfortini/Documents/Python/Wedding/scripts/setup-config.js)
Setup script that checks if `config/` exists, and if not, recursively copies files from `config.default/` to `config/`.

#### [MODIFY] [.gitignore](file:///Users/alexisfortini/Documents/Python/Wedding/.gitignore)
Add `/config/` to `.gitignore` to prevent committing your real guest details and secrets to a public Git repository.

#### [MODIFY] [tsconfig.json](file:///Users/alexisfortini/Documents/Python/Wedding/tsconfig.json)
Configure path alias `@config/*` pointing to `./config/*`.

#### [MODIFY] [package.json](file:///Users/alexisfortini/Documents/Python/Wedding/package.json)
Update scripts to run `node scripts/setup-config.js` in `predev` and `prebuild`.

#### [MODIFY] [next.config.ts](file:///Users/alexisfortini/Documents/Python/Wedding/next.config.ts)
Execute `scripts/setup-config.js` synchronously at configuration load time to ensure files exist under all runtime patterns.

---

### Core Data & UI Refactoring

#### [MODIFY] [mockDatabase.ts](file:///Users/alexisfortini/Documents/Python/Wedding/src/lib/mockDatabase.ts)
Refactor the seeds generation:
- Dynamically parse `config/groups.json` and generate deterministic UUIDs.
- Dynamically parse `config/events.json`, map groups by name to their deterministic UUIDs, and generate stable event IDs.
- Dynamically parse `config/guests.json` to generate stable party UUIDs and guest UUIDs. Automatically create appropriate mappings for public events and assigned group events.
- Inject helper function `getDeterministicUUID(name)` to ensure UUID stability.

#### [MODIFY] [Hero.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/Hero.tsx)
Load dynamic partner names, dates, location strings, and invite buttons from `weddingDetails.json`.

#### [MODIFY] [FAQ.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/FAQ.tsx)
Load the FAQ array dynamically from `weddingDetails.json`.

#### [MODIFY] [Registry.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/Registry.tsx)
Load registry descriptions and links from `weddingDetails.json`.

#### [MODIFY] [OurStory.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/OurStory.tsx)
Load the timeline story list from `weddingDetails.json`.

#### [MODIFY] [RestAndRecharge.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/RestAndRecharge.tsx)
Load airports, accommodation hotels, and favorite places dynamically from `weddingDetails.json`.

#### [MODIFY] [DJLineup.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/DJLineup.tsx)
Load event names and DJ lineups dynamically from `weddingDetails.json`.

#### [MODIFY] [MapSection.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/MapSection.tsx)
Load base map markers and center coordinates dynamically from `weddingDetails.json`. Map icon strings (e.g. `"Plane"`, `"Bed"`) to Lucide icon components.

#### [MODIFY] [GuestGate.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/GuestGate.tsx)
Load header and date display strings from `weddingDetails.json`.

#### [MODIFY] [admin/page.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/app/admin/page.tsx)
Load admin passcode verification and administrative user names validation from `weddingDetails.json`.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify Next.js static build compilation and TypeScript checks pass.

### Manual Verification
1. Verify that running the application works with real data on local environment.
2. Delete `/config` folder, run `npm run dev`, and verify it is automatically re-created containing default template files.
3. Check the page and verify that all text is correctly rendered from the JSON config.
4. Verify `/admin` passcode login works with the passcode configured in `weddingDetails.json`.
5. Try changing a text value in `config/weddingDetails.json` (e.g. the Hero title or a travel hotel) and verify it reflects on the page upon saving and hot-reloading.
