# Untappd Checkin Map

A client-side web app that visualizes your [Untappd](https://untappd.com) beer checkin history on an interactive map. Upload your CSV export and see where you've been drinking, what you've been drinking, and how you rated it.

Everything runs in the browser — no backend, no database, no account required.

## Getting started

```bash
npm install
npm run dev
```

Open the app, click **Upload**, and select your Untappd CSV export.

### Getting your Untappd data

Data export requires an [Untappd Insider](https://untappd.com/insider) subscription.

1. Go to [untappd.com](https://untappd.com) and sign in
2. Navigate to **Account → Beer History**
3. Request your export — Untappd will email you a download link
4. Upload the CSV file in the app

## How it works

### Map display

The map switches between two rendering modes based on how many distinct venues are visible in the current viewport:

- **> 100 venues** — heatmap mode with a white → yellow → amber gradient, where intensity reflects visit frequency
- **≤ 100 venues** — individual markers with beer glass icons

Markers use colored beer glass SVGs based on the dominant beer style at each venue:

| Color  | Styles                              |
|--------|-------------------------------------|
| Yellow | Lager, Pilsner, IPA, Wheat, Tripel  |
| Amber  | Bock, Porter, Brown Ale, Bitter     |
| Red    | Red Ale, Irish Red                  |
| Brown  | Dubbel, Quadrupel                   |
| Black  | Stout, Schwarzbier                  |
| Pink   | Sour, Gose, Lambic                  |
| Empty  | Unknown or missing style            |

Venues with multiple checkins show a double glass/cheers icon.

### Tooltips

Hovering a marker (or tapping on mobile) shows a tooltip with:

- Venue name and location
- Number of visits (distinct dates, with a 6am day boundary so late-night checkins count as the same day)
- Average rating (hidden if no checkins were rated)
- Up to 5 most recent beers with their style, sorted newest-first

## Tech stack

- [Vite](https://vitejs.dev) — dev server and build
- [TypeScript](https://www.typescriptlang.org) — strict mode
- [Leaflet](https://leafletjs.com) — map rendering
- [leaflet.heat](https://github.com/Leaflet/Leaflet.heat) — heatmap layer

No runtime dependencies beyond Leaflet. No backend, no framework.

## Project structure

```
src/
  main.ts              Entry point — wires map, store, renderer, upload panel
  csv-parse.ts         Client-side Untappd CSV parser
  venue-store.ts       In-memory checkin store with viewport queries
  checkin-renderer.ts  Switches between heatmap and markers on moveend
  upload.ts            Upload panel UI and file handling
  map.ts               Leaflet map initialization
  layers.ts            Marker/heatmap layer management, beer style icons
  popup.ts             Tooltip HTML builder
  types/
    checkins.d.ts      RawCheckin, VenueMarker, VenuesResponse types
    leaflet-heat.d.ts  Type declarations for leaflet.heat plugin
index.html             Single page with embedded styles
```

## Building for production

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file server.

## Privacy

Your checkin data never leaves your browser. The CSV is parsed client-side and held in memory — nothing is sent to any server.

## Built with

This project was built collaboratively with [Claude Code](https://claude.com/product/claude-code), Anthropic's AI coding assistant.

## Disclaimer

This project is not affiliated with, endorsed by, or connected to [Untappd](https://untappd.com). Untappd is a registered trademark of Next Glass, Inc.

## License

[MIT](LICENSE)
