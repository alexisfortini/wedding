# 🌵 Desert Chic Wedding Invitation & Concierge Website

Welcome to a premium, desert-chic, and highly customizable Next.js wedding invitation website. This project is built for modern couples who want a stunning, responsive invitation portal complete with interactive guest management, personalized itineraries, map guides, and a built-in AI concierge assistant. 

---

## ✨ Features & Highlights

* **🎨 Liquid Glass Design System**: Frosted glassmorphism overlays (`backdrop-blur-lg`), smooth transitions, and GPU-accelerated background parallax layouts optimized for mobile and desktop screens.
* **🤖 AI Wedding Concierge**: Integrated Gemini-powered chat assistant that serves as a custom concierge, answering guest questions about accommodations, dress codes, schedules, weather, and venue details.
* **🗺️ Interactive Mapbox Guides**: Fully integrated Mapbox maps showcasing wedding venues, hotels, local dining favorites, and activities with custom markers, colors, and travel recommendations.
* **🔒 Secure Admin Portal**: A passcode-protected `/admin` panel enabling couples to:
  * Add, edit, or delete guests and group households.
  * Define access groups (e.g., `Bridal Party`, `Rehearsal Dinner`) to restrict schedule visibility.
  * Schedule events with public or private visibility tag gates.
  * Instantly export guest list spreadsheets formatted for direct upload into **Aisle Planner**.
  * Back up, restore, or reset database states locally or from JSON backups.
* **📷 Sequential Gallery Grid**: A performant engagement gallery featuring sequential cascade loading animations, auto-generated WebP thumbnails for speed, and a high-resolution interactive fullscreen lightbox viewer.
* **⚡ Database-First with Local Fallback**: Uses live Supabase database sync (secured by Row-Level Security). If database environment variables are omitted, it falls back to an offline-first browser `localStorage` database seeded from local JSON configs, ensuring zero-config local testing.

---

## 📂 Project Structure & Configurations

All static content, layouts, guest list seeds, and credentials are kept in a single location: `/config/`. If a fresh clone is built, template files are automatically copied from `/config.default/` to `/config/` so the site compiles out-of-the-box.

### 1. Website Settings (`/config/ui/`)
* **`general.json`** 📝: Partner names, wedding date, location string, RSVP open dates, and deadline notifications.
* **`admin.json`** 🔐: List of authorized administrators and the passcode used to log into the admin dashboard (defaults to `indio2027`).
* **`faq.json`** ❓: Styled Q&A lists including dress codes, plus-one policies, parking exceptions, and shoes suitable for grass lawns.
* **`weekend.json`** 🗓️: Main titles and descriptions for the weekend schedule.
* **`dj_lineup.json`** 🎵: Schedule times, names, and tracks for performing artists.
* **`story.json`** 💕: Text slides and subtitles detailing the couple's relationship timeline.
* **`travel.json`** ✈️: Airports, travel tips, hotel room blocks, and recommended dining/activity lists.
* **`registry.json`** 🎁: Registry cash funds, target descriptions, and dynamic button actions.
* **`map.json`** 📍: Coordinates, marker details (hotels, airports, venue), custom colors, and zoom levels.

### 2. Database Seeds (`/config/db/`)
* **`groups.json`** 🏷️: Restricted guest segments (e.g., `Estate Guests`, `Rehearsal Dinner`, `Bachelor Party`).
* **`events.json`** 📅: Full events schedule defining dates, timings, locations, dress codes, and visibility group gates.
* **`guests.json`** 👥: Nestable guest list grouped by household/party, mapping first/last names, contact details, mailing addresses, and group tags.

---

## 🚀 Getting Started

### 1. Setup Environment Keys
Create a local environment file by copying the template:
```bash
cp .env.example .env.local
```
Open `.env.local` and add your project-specific credentials for:
* **Supabase** (Database connection & RLS configuration)
* **Mapbox** (Public map rendering token)
* **Google Gemini** (API key for the AI concierge chat)

### 2. Start the Development Server
Install dependencies and run the hot-reloading development server:
```bash
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to view the website.

### 3. Sync Database Configurations
To pull the latest cloud database configurations locally, or push local seed modifications back to Supabase:
* **Pull cloud data locally**:
  ```bash
  node scratch/download_data.js
  ```
* **Push local configs to cloud**:
  ```bash
  node scratch/sync_ui_to_supabase.js
  ```

### 4. Build for Production
To compile TypeScript, optimize image loaders, and generate static pages:
```bash
npm run build
```

---

## 📦 Container Deployment

The project is fully Dockerized and optimized for hosting on **Google Cloud Run**.

To build the container and deploy the service to your active Google Cloud project:
```bash
./scripts/deploy.sh
```

---

## 🛡️ License

This project is open-source and customizable. Built with ❤️ for Alexis & Kelsey.
