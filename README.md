# Personal Website

Static site built with Eleventy. Deploys automatically to `critchlow.us` via GitHub Actions.

## Quick Start

```bash
npm install          # Install dependencies
npm start            # Dev server at localhost:8080
npm run build        # Build to _site/
```

## Structure

```
src/
├── _includes/       # Nunjucks templates
│   ├── base.njk     # Main layout (nav, footer, head)
│   └── post.njk     # Blog post wrapper
├── _data/           # Data files (executed at build time)
│   ├── photos.js    # Auto-generates photo gallery list
│   ├── projects.js  # Projects list (manually maintained)
│   ├── gems.js      # Processes gems.json, fetches external images
│   └── links.js     # Processes links.json for shortlinks
├── posts/           # Blog posts (markdown)
├── pages/           # Static pages (about, writing, gallery, projects, gems)
├── css/             # Styles (single file)
├── gems.json        # Curated recommendations (podcasts, videos, writing, apps)
├── links.json       # Short URL redirects
└── index.njk        # Homepage

public/              # Static assets (copied as-is)
├── gallery/         # Full-size photos
├── gallery-thumbs/  # Photo thumbnails
└── headshot.jpg     # Profile pic

.eleventy.js         # Build config
.github/workflows/   # GitHub Actions deployment
```

## Build-Time Data Fetching

The site fetches external data during the build process:

### Gems Page (`/gems/`)

A curated collection of podcasts, videos, articles, and apps. Edit `src/gems.json` to add items.

**Podcasts** — Artwork fetched from RSS feeds at build time
```json
{
  "id": "serial",
  "type": "podcast",
  "title": "Serial",
  "url": "https://serialpodcast.org/",
  "rss": "https://feeds.simplecast.com/xl36XBC2",
  "description": "The podcast that started it all",
  "episodes": [
    { "label": "Favorite", "title": "Leakin Park", "url": "..." }
  ]
}
```
- `rss` field: Feed URL, used to extract `<itunes:image>` artwork
- `episodes` (optional): Curated picks with custom labels

**Videos** — YouTube thumbnails auto-generated from video URL
```json
{
  "id": "alphago",
  "type": "youtube",
  "title": "AlphaGo - The Movie",
  "url": "https://www.youtube.com/watch?v=WXuK6gekU1Y",
  "description": "The story of AlphaGo vs Lee Sedol"
}
```
- Thumbnail auto-fetched: `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`

**Writing** — Articles and blog posts (no auto-fetching)
```json
{
  "id": "article-name",
  "type": "writing",
  "title": "Article Title",
  "url": "https://example.com/article",
  "source": "Publication Name",
  "description": "Brief description"
}
```

**Apps** — iOS app icons fetched from iTunes API
```json
{
  "id": "overcast",
  "type": "app",
  "title": "Overcast",
  "url": "https://overcast.fm/",
  "appStoreId": "888422857",
  "platform": "iOS",
  "developer": "Marco Arment",
  "description": "The best podcast player"
}
```
- `appStoreId`: Used to fetch icon from `https://itunes.apple.com/lookup?id={appStoreId}`

### Short Links (`/link/`)

Edit `src/links.json` to create redirect URLs:
```json
{ "nickname": "github", "label": "GitHub", "url": "https://github.com/DomCritchlow" }
```
Creates: `critchlow.us/link/github` → redirects to GitHub

## Adding Content

### New Blog Post

Create `src/posts/my-post.md`:

```markdown
---
layout: post.njk
title: Post Title
date: 2025-01-15
description: Brief description
categories: Category
permalink: /writing/my-post/
---

Content here...
```

### New Project

Edit `src/_data/projects.js` and add to the array:

```javascript
{
  title: "Project Name",
  shortname: "projectname",  // Used for URL: critchlow.us/projectname
  url: "https://live-app-url.com",
  github: "https://github.com/username/repo",
  description: "What it does",
  date: "2025-01-15",
  type: "web",  // web, api, app, hardware
  logo: "🚀"
}
```

Creates redirect URLs:
- `critchlow.us/{shortname}` → project URL
- `critchlow.us/{shortname}/github` → GitHub repo

### New Photo

1. Add full image to `public/gallery/filename.jpg`
2. Add thumbnail to `public/gallery-thumbs/filename.jpg` (200x200px recommended)
3. Images auto-populate (no code changes needed)

Gallery auto-detects `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` files.

## Deployment

Pushes to `main` branch automatically trigger deployment via GitHub Actions:

1. Installs dependencies
2. Runs build (fetches external data like podcast artwork)
3. Deploys `_site/` to `gh-pages` branch
4. Sets CNAME to `critchlow.us`

```bash
git add .
git commit -m "Update site"
git push origin main
```

Site live at https://critchlow.us within 1-2 minutes.

## Dependencies

- `@11ty/eleventy` - Static site generator
- `luxon` - Date formatting
- `markdown-it` - Markdown parser
- `markdown-it-anchor` - Header anchors
- `sharp` - Image processing (thumbnails)

## Development Notes

- `npm start` runs dev server on `:8080` with hot reload
- Build-time data fetching adds ~2-5 seconds (RSS/API calls)
- Gallery uses CSS-only lightbox (no JS)
- Gems page has client-side category filtering
- All pages use `base.njk` layout
- Build output goes to `_site/` (gitignored)
