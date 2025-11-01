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
│   ├── base.njk    # Main layout (nav, footer, head)
│   └── post.njk    # Blog post wrapper
├── _data/          # Data files
│   ├── photos.js   # Auto-generates photo gallery list
│   └── projects.js # Projects list (manually maintained)
├── posts/          # Blog posts (markdown)
├── pages/          # Static pages (about, writing, gallery, projects)
├── css/            # Styles (single file)
└── index.njk       # Homepage

public/             # Static assets (copied as-is)
├── gallery/        # Full-size photos
├── gallery-thumbs/ # Photo thumbnails
└── headshot.jpg    # Profile pic

.eleventy.js        # Build config
.github/workflows/  # GitHub Actions deployment
```

## How It Works

**Pages**: Any `.njk` or `.md` file in `src/` becomes a page

**Posts**: Markdown files in `src/posts/` with frontmatter:
- Sorted by `date` field (newest first)
- Must have `permalink` for URL
- Uses `post.njk` layout

**Styles**: Single CSS file at `src/css/style.css`

**Images**: Everything in `public/` gets copied to output root

**Data Files**: JavaScript files in `src/_data/` export data available to all templates:
- `photos.js` - Auto-reads images from `public/gallery/`
- `projects.js` - Returns array of project objects

**Collections**: Eleventy creates collections automatically:
- `posts` - All markdown files in `src/posts/`, sorted by date
- `latest` - Combined feed of posts + projects (top 8), sorted by date

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
  github: "https://github.com/username/repo",  // Optional
  description: "Detailed description of what it does, technologies used, and key features",
  date: "2025-01-15",  // Used for sorting in Latest feed
  type: "web",  // Options: "web", "api", "app", "hardware"
  logo: "🚀"  // Optional: Emoji or icon to distinguish the project
}
```

**Where it appears:**
- `/projects/` page - Listed with full description, type badge, and GitHub link
- Homepage "Latest" section - Mixed with recent blog posts, sorted by date
- Project links open in new tab, GitHub links included when provided

**Short URL Redirects:**
Each project automatically gets clean redirect URLs:
- `critchlow.us/{shortname}` → redirects to project URL
- `critchlow.us/{shortname}/github` → redirects to GitHub repo

**Current projects:**
- **HamOps** - Amateur Radio Operations Center (REST APIs + MCP)
  - `critchlow.us/hamops` → Live app
  - `critchlow.us/hamops/github` → GitHub repo
- **Enneagram Explorer** - Personality type mapping tool
  - `critchlow.us/enneagram` → Live app
  - `critchlow.us/enneagram/github` → GitHub repo

### New Photo

**Option 1: Manual Upload**
1. Add full image to `public/gallery/filename.jpg`
2. Add thumb to `public/gallery-thumbs/filename.jpg` (200x200px recommended)
3. Images auto-populate (no code changes needed)

**Option 2: Upload from iPhone** 
Upload photos directly from your iPhone's share sheet using a custom shortcut that automatically creates thumbnails and deploys to the site.

📱 **[Setup Guide: Photo Upload from iPhone](.github/PHOTO_UPLOAD_SETUP.md)**

**Security Features:**
- Webhook secret authentication prevents unauthorized uploads
- Filename sanitization prevents path traversal attacks
- Image validation (format, size limits)
- Only accepts JPEG, PNG, WebP under 10MB

Gallery auto-detects `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` files and sorts alphabetically.

## Deployment

### Automatic Deployment via GitHub Actions

Pushes to `main` (or `master`) branch automatically trigger deployment:

**Workflow** (`.github/workflows/eleventy-deploy.yml`):
1. Checks out code
2. Sets up Node.js 20 with npm cache
3. Installs dependencies (`npm ci`)
4. Builds site (`npm run build`)
5. Deploys `_site/` to `gh-pages` branch using `peaceiris/actions-gh-pages@v3`
6. Sets custom domain CNAME to `critchlow.us`

**Prerequisites:**
- GitHub Pages enabled in repository settings
- Source set to deploy from `gh-pages` branch
- Custom domain DNS configured to point to GitHub Pages
- `GITHUB_TOKEN` automatically provided by GitHub Actions

**To Deploy:**
```bash
git add .
git commit -m "Update site"
git push origin main
```

Site will be live at https://critchlow.us within 1-2 minutes.

## Eleventy Config

`.eleventy.js` does:
- Copies `public/` and `src/css/` to output
- Creates `posts` collection from `src/posts/*.md`
- Sorts posts by date (desc)
- Adds date formatting filters
- Configures markdown rendering

## File Naming

- Posts: Clean names without dates (e.g., `my-post.md` not `2025-01-15-my-post.md`)
- Date comes from frontmatter `date:` field
- Permalink controls URL structure

## Development

Changes rebuild automatically when using `npm start`. Server runs on `:8080`.

## Dependencies

Core:
- `@11ty/eleventy` - Static site generator
- `luxon` - Date formatting
- `markdown-it` - Markdown parser
- `markdown-it-anchor` - Header anchors

## Homepage "Latest" Section

The homepage combines blog posts and projects into a unified "Latest" feed:
- Merges items from `collections.posts` and `projects` data
- Sorts by date (newest first)
- Shows top 8 items with title, type badge, and description
- Project links open in new tab, blog posts are internal links

To feature something on the homepage:
- **Blog post**: Add new post with recent date
- **Project**: Add to `projects.js` with recent date

## Security

### Photo Upload Security
- **Webhook Secret Authentication**: All photo uploads require a secret key stored in GitHub Secrets
- **Filename Sanitization**: Prevents path traversal attacks (e.g., `../../etc/passwd`)
- **Image Validation**: Verifies uploaded files are actual images (JPEG, PNG, WebP only)
- **Size Limits**: Maximum 10MB per image
- **Format Validation**: Uses `sharp` to verify image metadata before processing

### Token Management
- GitHub Personal Access Token required for uploads (store securely)
- Webhook secret stored in GitHub repository secrets (never in code)
- Both should be treated as sensitive credentials

### Best Practices
- Never commit tokens or secrets to the repository
- Regularly rotate your GitHub Personal Access Token
- Monitor GitHub Actions logs for suspicious activity
- `.env` files are gitignored to prevent accidental commits

## Notes

- Gallery uses CSS-only lightbox (no JS)
- All pages use `base.njk` layout
- Nav active states handled in template
- Build output goes to `_site/` (gitignored)
- Projects page at `/projects/` with dedicated nav link
