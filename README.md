# My Digital Room

An interactive, desktop-first portfolio presented as a warm spaceship bedroom.

Live site: https://dormiveglia1.github.io/my_digital_room/

## What it is

My Digital Room is Yuhao (Eric) Zhang's personal Computer Science portfolio. Visitors explore a bedroom, flight deck, and hidden collection vault; projects, photos, music, game diaries, Leo's Corner, and signals are all driven by repository-local content.

## Stack

- HTML, CSS, and vanilla JavaScript
- Node.js standard library for the local editor server
- GitHub Actions and GitHub Pages for deployment
- Layered 2D scene artwork and CSS-calibrated hotspots

There is no hosted backend or database. This is intentional: the repository is the source of truth.

## Local data workflow

The file site-data.js is the content database. User-uploaded files are copied to assets/user-content/.

1. In the repository root, run npm run admin.
2. Open http://127.0.0.1:4173/admin.html.
3. Edit content or upload files. Every save updates site-data.js; every upload is stored under assets/user-content/.
4. Check the public site at http://127.0.0.1:4173/.
5. Publish with Git: git add site-data.js assets/user-content, then git commit -m "Update portfolio content", then git push origin main.

GitHub Pages is read-only. The deployed admin page can display the editor interface, but it cannot write to your repository. Always use npm run admin locally for changes.

## Repository guide

- index.html — public portfolio markup, scenes, dialogs, and mobile view.
- app.js — public interaction state, hotspots, dialogs, music, and rendering from site-data.js.
- styles.css — desktop and mobile visual styles.
- site-data.js — tracked local content database.
- admin.html and admin.css — local Mission Control interface.
- local-admin.js — CRUD, drag ordering, image compression, upload progress, game diary editing, and local saves.
- tools/local-editor-server.mjs — dependency-free Node server that serves the site and writes local data/assets.
- assets/my-digital-room/ — scene art, state images, overlays, and sprites.
- assets/user-content/ — files added through the local editor.
- .github/workflows/deploy-pages.yml — GitHub Pages deployment on every push to main.
- supabase/ — archived SQL from the former Supabase version; it is not required by the current site.

## Content shape

site-data.js stores profile, project folders, photo wall items, music tracks, game folders and diaries, vault slots, and flight-deck signals.

## Development notes

- The desktop experience uses four pre-rendered bedroom states rather than runtime 3D; this keeps visual quality high and works on GitHub Pages.
- Mobile is a lightweight, accessible scrolling portfolio.
- Hotspot geometry is calibrated in app.js and styles.css.
- Image uploads are automatically resized when needed before being written to assets/user-content/.
- No framework or database service is required for local development or deployment.

## Author

Yuhao (Eric) Zhang
Computer Science, McMaster University
Focus: Full-Stack Development, AI Engineering, and Game Development.