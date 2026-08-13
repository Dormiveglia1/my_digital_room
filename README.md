# My Digital Room

> An interactive, desktop-first portfolio presented as a warm spaceship bedroom.

**Live site:** [dormiveglia1.github.io/my_digital_room](https://dormiveglia1.github.io/my_digital_room/)
**Private editor:** [Admin console](https://dormiveglia1.github.io/my_digital_room/admin.html)

![My Digital Room bedroom scene](assets/my-digital-room/bedroom/base/bedroom-master.png)

## Overview

My Digital Room is a personal portfolio for **Yuhao (Eric) Zhang**, a Computer Science student at McMaster University. Instead of a conventional résumé page, visitors enter a small explorable spaceship: a bedroom for profile, work, music, games, photos, and Leo; a flight deck for communications; and a hidden collection vault reached through a golden cube.

The public site is intentionally lightweight and static-hosted. A private browser-based admin console connects to Supabase so the owner can update content without editing source code.

## Highlights

- Desktop scene exploration with image-based hotspots and scene state changes.
- Four bedroom visual states: profile/photo wall × computer on/off.
- Project desktop with Full-Stack, AI, Game Dev, and Coursework folders.
- Photo wall, music player, game folders with diary entries, and Leo's Corner.
- Flight-deck communications interface and an easter-egg collection vault.
- Private content console for profile, links, résumé, projects, photos, music, games, messages, collection items, and visits.
- Supabase Auth, Postgres, Storage, and Row Level Security.
- Mobile light-browsing mode that presents the portfolio as an accessible scrolling page.
- Automated GitHub Pages deployment on every push to `main`.

## Architecture

```text
Visitor browser
  ├─ index.html + styles.css + app.js
  ├─ local fallback data (site-data.js)
  └─ Supabase public reads
       ├─ Postgres: projects, settings, photo metadata, games, messages
       └─ Storage: images, MP3 files, résumé PDFs

Owner browser
  ├─ admin.html + admin.css + admin.js
  ├─ Supabase Auth: email/password session
  └─ Supabase writes, guarded by RLS

GitHub repository
  └─ GitHub Actions → GitHub Pages
```

## Tech Stack

| Area | Choice |
| --- | --- |
| Public UI | HTML5, CSS3, vanilla JavaScript |
| Interaction model | CSS image hotspots, dialogs, scene state machine |
| Backend | Supabase (Postgres, Storage, Auth, RLS) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |
| Asset strategy | Layered 2D scene art, overlays, and sprites |

No build framework is required. This keeps the site simple to host and easy to inspect, while Supabase provides the dynamic content layer.

## Repository Guide

```text
.
├─ index.html                 # Public site markup: entry, scenes, dialogs, mobile view
├─ app.js                     # Public interactions, scene state, content hydration, analytics
├─ styles.css                 # Desktop scene and responsive mobile styles
├─ site-data.js               # Default/fallback content when Supabase is unavailable
│
├─ admin.html                 # Private content-management UI
├─ admin.js                   # Auth, CRUD, uploads, editor rendering, visit metrics
├─ admin.css                  # Admin console styles
│
├─ supabase.public.config.js  # Browser-safe Supabase URL + publishable key (local only)
├─ assets/my-digital-room/    # Visual assets used by public scenes
│   ├─ entry/                 # Space introduction background and ship sprite
│   ├─ bedroom/               # Bedroom state images, overlays, and props
│   ├─ bridge/                # Flight deck art and overlays
│   └─ collection-vault/      # Vault art and overlays
│
├─ supabase/                  # Repeatable SQL setup and migration scripts
│   ├─ schema.sql             # Initial database schema, policies, and Storage bucket
│   ├─ bootstrap-core-tables.sql
│   ├─ add-game-diary-folders.sql
│   ├─ fix-storage-policies.sql
│   └─ lock-single-admin.sql  # Single-admin RLS hardening
│
└─ .github/workflows/
    └─ deploy-pages.yml       # Deploys the repository to GitHub Pages
```

## Data Model

| Table | Purpose |
| --- | --- |
| `site_settings` | Profile text, links, résumé URL, Leo details |
| `projects` | Portfolio projects and their links |
| `photos` | Photo metadata and Storage paths |
| `music_tracks` | Ambient tracks and Storage paths |
| `game_entries` | Game folders and cover images |
| `game_diary_entries` | Individual entries within a game folder |
| `game_entry_media` | Images attached to diary entries |
| `collection_items` | Vault shelf items and slot positions |
| `terminal_messages` | Flight-deck communications content |
| `page_visits` | Anonymous visit events |

Files live in the `portfolio-assets` Storage bucket. Database records store their paths or generated public URLs rather than embedding the files directly in Postgres.

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/Dormiveglia1/my_digital_room.git
cd my_digital_room
```

### 2. Create a local Supabase public config

Create `supabase.public.config.js` in the project root:

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  publishableKey: "YOUR_PUBLISHABLE_KEY"
};
```

This file is ignored by Git. Use only the browser-safe publishable/anon key; **never** put a Supabase service-role key in a frontend project.

### 3. Start a static web server

For example, with Python:

```bash
python -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173/
http://127.0.0.1:4173/admin.html
```

A web server is needed because browser module, fetch, and media behavior can differ when opening HTML directly from the filesystem.

## Supabase Setup

1. Create a Supabase project.
2. In **SQL Editor**, run the SQL files in `supabase/` in this order:

```text
schema.sql
bootstrap-core-tables.sql        # only if core tables need repair/recreation
add-game-diary-folders.sql
fix-storage-policies.sql
lock-single-admin.sql
```

3. In `lock-single-admin.sql`, set the administrator UUID to the Auth user who should control the portfolio.
4. Create or confirm the public Storage bucket named `portfolio-assets`.
5. Add your project URL and publishable key to `supabase.public.config.js`.
6. In **Authentication → URL Configuration**, allow local URLs and the GitHub Pages URLs used by the public site and `admin.html`.

### Security model

- Public visitors can read only published portfolio content.
- Public visitors can create anonymous visit records only.
- The browser admin console signs in using Supabase Auth.
- `lock-single-admin.sql` replaces broad owner rules with a `portfolio_admins` allow-list, so only the configured administrator can write data or upload/delete assets.

## Content Workflow

1. Visit `/admin.html` and sign in.
2. Update profile links, résumé, and profile photo.
3. Create projects and choose their order.
4. Upload photos, music, game covers, diary entries, and collection items.
5. Refresh the public page to confirm the content is visible.

For public content, the site first renders `site-data.js` and then hydrates from Supabase. This provides a graceful fallback if the backend is temporarily unavailable.

## Deployment

The repository includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

```bash
git add .
git commit -m "Describe your change"
git push origin main
```

Every push to `main` triggers GitHub Actions and publishes the static site. The deployed site remains connected to the same Supabase project, so content changes made from the admin console do **not** need a new GitHub deployment.

## Development Notes

- Desktop and mobile intentionally use different interaction patterns: immersive scenes on desktop, content-first scrolling on mobile.
- Scene state is handled through pre-rendered visual variants rather than runtime 3D. This preserves illustration quality and keeps hosting simple.
- Clickable scene objects use CSS hotspot geometry. Adjusting a hotspot is a visual calibration task, not a database task.
- Asset updates belong in `assets/my-digital-room/`; append a version query string when a browser cache needs to be bypassed.

## Future Ideas

- Drag-and-drop ordering in the admin console.
- Image compression and upload-progress feedback.
- A real moderated guest-message feature.
- More detailed analytics, such as referrers and device categories.
- Custom-domain support through GitHub Pages and Supabase Auth redirect URLs.

## Author

**Yuhao (Eric) Zhang**

Computer Science, McMaster University
Focus: Full-Stack Development, AI Engineering, and Game Development.
