# Pitches & Tones

A static Next.js / React recreation of https://yalepitchesandtones.com/.

## Development

```sh
npm install
npm run dev
```

Open http://localhost:3000. `npm run build` generates a portable static website in `out/`; no application server, database, WordPress installation, or account system is required. `npm run check` checks TypeScript.

## Project structure

- `app/[[...slug]]/page.tsx` renders the captured pages as React elements and generates all static routes.
- `components/SiteBehavior.tsx` implements the photo slideshow, responsive menu, accordions, native audio controls, and YouTube dialog.
- `content/` contains editable page content and the original page-specific CSS cascade. `routes.json` lists the 91 captured routes, including biographies and news articles.
- `public/assets/` contains local photographs, logos, fonts, album audio, and social thumbnails. Large photos are optimized to WebP for presentation on the web.
- `scripts/capture-reference.py` captures the eight main pages. Run it again with `--linked` to capture linked biographies and articles. Requires Python 3 and `beautifulsoup4`; it uses macOS/system curl certificate trust. `node scripts/optimize-assets.mjs` then optimizes large photographs.

## Fidelity and scope

The original markup, fonts, colors, spacing, layouts, photographs, text, and responsive theme styles are retained. React replaces the WordPress JavaScript interactions. Main navigation, member profiles, news articles, rush/alumni accordions, music playback, and external social/contact links work without WordPress. Social feeds are a local snapshot; their Load More controls open the corresponding live service. YouTube playback requires internet access. The contact page uses the original email link.

The original `/bio/kimberly-chavez-aliva/` returns HTTP 404; its link is preserved. Historical links outside the captured main pages, such as old profile aliases and archive pagination, still point to the reference site. No content was invented for unavailable pages.

Validation: production static build, TypeScript checking, and local asset/route integrity checks. Browser-based visual comparison was unavailable in this environment, so pixel-perfect visual equivalence has not been verified.
