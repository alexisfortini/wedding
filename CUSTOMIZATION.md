# 🎨 Customization & Configuration Guide

This guide details how to customize the text, layouts, images, and maps in this template.

---

## ⚙️ Customizing Content via JSON

All main configurations are stored in `config/ui/` (as JSON files). You can edit them locally or use the Admin portal to sync them live.

### 1. General Settings (`general.json`)
Controls base variables and RSVP gating:
```json
{
  "partner1": "Alexis",
  "partner2": "Kelsey",
  "date": "April 3, 2027",
  "raw_date": "2027-04-03",
  "location_name": "Indio, California",
  "invite_message": "We Joyfully Invite You",
  "rsvp_prompt": "Will you join us?",
  "rsvp_open_date": "2027-01-01",
  "rsvp_deadline_message": "Please let us know your plans by February 6th."
}
```
* `rsvp_open_date`: Set to YYYY-MM-DD (e.g. `2027-01-01`) to lock the RSVP form until that date. Set to empty `""` to open it immediately.
* `rsvp_deadline_message`: The deadline text rendered at the top of the RSVP forms.

### 2. Registry Cash Funds (`registry.json`)
Lists cash registries and honeymoon funds. Standard format:
```json
{
  "registry_url": "https://zola.com/registry/your-link",
  "funds": [
    {
      "id": "honeymoon",
      "title": "Honeymoon Fund",
      "description": "Help us plan our first getaway as newlyweds.",
      "button_text": "Contribute to Honeymoon"
    }
  ]
}
```

### 3. Schedule Timelines (`weekend.json` & `dj_lineup.json`)
Defines the landing page timeline descriptions and late-night DJ events:
* Set times, track references, and locations.
* Dress code tooltip details can be specified by separating sections with a colon (`:`). The component [TheWeekend.tsx](file:///Users/alexisfortini/Documents/Python/Wedding/src/components/TheWeekend.tsx) parses strings containing `:` to show elegant popovers.

---

## 📷 Dynamic Image Positioning & Zoom (Scale & Shift)

To ensure background images align perfectly across different screen sizes, the project uses a custom image positioning system in [imageHelper.ts](file:///Users/alexisfortini/Documents/Python/Wedding/src/lib/imageHelper.ts) and [globals.css](file:///Users/alexisfortini/Documents/Python/Wedding/src/app/globals.css).

### The Configuration (`images.json`)
Each page background supports distinct scale (zoom) and offset (position shifts) parameters for both desktop and mobile viewports:
```json
{
  "hero": {
    "src": "/photos/engagement/K%26A%20Engagement%20Shoot-1.jpg",
    "desktopPos": "50% 50%",
    "desktopScale": "1.1",
    "mobilePos": "50% 50%",
    "mobileScale": "1.3"
  }
}
```

### How It Works Under the Hood
1. The **Admin Dashboard** provides interactive sliders for horizontal shift, vertical shift, and zoom.
2. The component reads these parameters and outputs CSS custom properties:
   ```typescript
   const styles = {
     "--desktop-pos": config.desktopPos,
     "--desktop-scale": config.desktopScale,
     "--mobile-pos": config.mobilePos,
     "--mobile-scale": config.mobileScale,
   } as React.CSSProperties;
   ```
3. A global CSS utility applies these variables responsively using media queries:
   ```css
   .responsive-bg-image {
     object-position: var(--mobile-pos, 50% 50%);
     transform: scale(var(--mobile-scale, 1));
   }
   
   @media (min-width: 768px) {
     .responsive-bg-image {
       object-position: var(--desktop-pos, 50% 50%);
       transform: scale(var(--desktop-scale, 1));
     }
   }
   ```
This prevents background faces or critical highlights from being cut off on thin mobile portrait screens or ultra-wide desktop displays.

---

## 🗺️ Interactive Maps (`map.json`)

Coordinates and markers are configured inside `map.json`:
* Set the center `lat` and `lng`.
* Set default zoom heights (`zoomDesktop` and `zoomMobile`).
* Set marker pins for hotels, venues, and airports. Markers support custom icons, popover titles, and action links.
* Provide directions panels configuration for quick navigation shortcuts.
