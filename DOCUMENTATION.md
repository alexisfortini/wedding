# 📚 Repository Documentation Index

Welcome to the documentation library for the Wedding Invitation & Concierge Website. Below is an index of guides to help you understand, customize, and deploy this project.

---

## 📂 Documentation Library

### 1. 🏗️ [ARCHITECTURE.md](file:///Users/alexisfortini/Documents/Python/Wedding/ARCHITECTURE.md)
* **What it covers**: High-level system structure, codebase directories, dual-database local fallback engine mechanics, glassmorphic UI styling, and sequential image loading animations.
* **Read this to**: Understand the technical choices, library frameworks, rendering methods, and frontend design patterns.

### 2. 🗄️ [DATABASE.md](file:///Users/alexisfortini/Documents/Python/Wedding/DATABASE.md)
* **What it covers**: Supabase relational tables (`parties`, `guests`, `groups`, `events`, `guest_events`), Row-Level Security (RLS) policies, public read/write permission scopes, and server-side admin endpoints.
* **Read this to**: Understand how guests are grouped into households, how event visibility gates are structured, and how the database is secured.

### 3. 🎨 [CUSTOMIZATION.md](file:///Users/alexisfortini/Documents/Python/Wedding/CUSTOMIZATION.md)
* **What it covers**: Modular JSON configurations, cash registry details, scheduled itineraries, Mapbox coordinates/markers, and the desktop/mobile focal positioning and zoom scale sliders.
* **Read this to**: Modify the invitation text, set RSVP deadlines, customize local recommendation maps, and adjust image framing.

### 4. 🚀 [DEPLOYMENT.md](file:///Users/alexisfortini/Documents/Python/Wedding/DEPLOYMENT.md)
* **What it covers**: Environment variables setup, Google Cloud Run deployment script (`deploy.sh`), and the local-to-cloud synchronization workflows (`download_data.js` and `sync_ui_to_supabase.js`).
* **Read this to**: Deploy your own instance of the website, sync guest lists locally, and backup or seed your Supabase database.
