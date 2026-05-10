---
permalink: false
---

# Shit My AI Says

A small Eleventy-powered static site for curated screenshots of funny, weird, sweet, and mildly feral AI chat moments.

## What this repo is

This repo builds and deploys the public gallery site for **Shit My AI Says**.

Current stack:
- **Static site generator:** Eleventy (11ty)
- **Hosting:** GitHub Pages
- **Deployment:** GitHub Actions on push to `main`
- **Content model:** one markdown file per post, plus a screenshot image in `assets/posts/<year>/`

In plain English: this is a lightweight static site. The repo contains the content, templates, styling, and deployment workflow. Pushing to `main` rebuilds the site and publishes it.

## High-level architecture

The site is made of four main pieces:

1. **Content**
   - Post files live in `content/posts/`
   - Each post is a markdown file with frontmatter only, no body content required right now
   - Screenshot images live in `assets/posts/<year>/`

2. **Templates and layouts**
   - Page templates live in `src/`
   - Shared layouts live in `src/_includes/layouts/`
   - `src/index.njk` renders the home page gallery
   - `src/_includes/layouts/post.njk` renders individual exhibit pages
   - `src/_includes/layouts/base.njk` provides the site chrome, fonts, and stylesheet link

3. **Build configuration**
   - `.eleventy.js` configures collections, passthrough asset copying, and relative asset helpers
   - `content/posts/posts.11tydata.js` defines post permalinks as `/posts/<slug>/`
   - `src/src.11tydata.js` provides global site metadata and homepage permalink behavior

4. **Deployment**
   - `.github/workflows/deploy.yml` runs on every push to `main`
   - GitHub Actions installs dependencies, builds the site, uploads `_site/`, and deploys to GitHub Pages

## Repo layout

```text
.
├── .eleventy.js
├── .github/workflows/deploy.yml
├── assets/
│   └── posts/<year>/...png
├── content/
│   └── posts/
│       ├── *.md
│       └── posts.11tydata.js
├── scripts/
│   └── new-post.mjs
├── src/
│   ├── _includes/
│   │   └── layouts/
│   │       ├── base.njk
│   │       └── post.njk
│   ├── assets/
│   ├── index.njk
│   ├── src.11tydata.js
│   └── CNAME
├── package.json
└── README.md
```

## How posts work

Each exhibit is represented by:
- a markdown metadata file in `content/posts/`
- a screenshot image in `assets/posts/<year>/`

Example post file:

```yaml
---
layout: layouts/post.njk
tags:
  - post
  - silly
  - wordplay
title: Times New Ramen
date: 2026-05-09
image: assets/posts/2026/times-new-ramen.png
caption: When you’ve been vibe coding with your AI after some cocktails and finally call it a night…
tuesdayComment: Times New Ramen is regrettably perfect.
---
```

Important fields:
- `layout`: currently always `layouts/post.njk`
- `title`: display title
- `date`: used for display and ordering
- `image`: path to the screenshot asset
- `caption`: the setup or context for the screenshot
- `tuesdayComment`: the short house-commentary line
- `tags`: currently mostly decorative, but still useful metadata

At the moment, posts do **not** require markdown body content. The frontmatter is the post.

## Normal posting workflow

Current manual workflow:

1. Save or copy the screenshot image into:
   - `assets/posts/<year>/<slug>.png`
2. Create a matching markdown file in:
   - `content/posts/YYYY-MM-DD-<slug>.md`
3. Fill in the frontmatter:
   - title
   - date
   - image path
   - caption
   - Tuesday comment
   - tags
4. Build locally:
   - `npm run build`
5. Commit and push to `main`
6. GitHub Pages deploys automatically

Example command to scaffold a post file:

```bash
node scripts/new-post.mjs "Title" "Optional caption"
```

Notes about `scripts/new-post.mjs`:
- it creates the markdown file only
- it assumes the image will be named `assets/posts/<year>/<slug>.png`
- it does **not** copy or process the screenshot automatically
- it leaves `tuesdayComment: TODO` for manual editing

## Local development

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Build once:

```bash
npm run build
```

Output goes to:

```text
_site/
```

## How the homepage is assembled

`src/index.njk` does the following:
- pulls the `post` collection from Eleventy
- reverses it so newest posts appear first
- treats the newest post as the featured exhibit
- renders the rest as gallery cards

The home page depends on `collections.post`, which is defined in `.eleventy.js` using:
- `./content/posts/*.md`

## How assets are resolved

`.eleventy.js` defines:
- a passthrough copy for `assets`
- a shortcode called `asset`
- a `relativeUrl` filter

This means:
- images and CSS are copied directly into the built site
- templates can safely reference assets from nested pages without broken relative paths

That asset helper is important. If image paths ever look wrong on nested post pages, this is one of the first places to inspect.

## Deploy and publish flow

Deployment lives in:
- `.github/workflows/deploy.yml`

On push to `main`, GitHub Actions:
1. checks out the repo
2. sets up Node 20
3. runs `npm ci`
4. runs `npm run build`
5. uploads `_site/`
6. deploys to GitHub Pages

If the site ever stops updating, the likely suspects are:
- a broken build
- a malformed frontmatter file
- a missing image path
- a GitHub Actions failure
- a Pages deployment issue

## Fast troubleshooting checklist

If something breaks, check in roughly this order:

### 1. Can it build locally?
```bash
npm run build
```
If this fails, the issue is probably content, templates, or config.

### 2. Did the post file have valid frontmatter?
Common problems:
- missing closing `---`
- bad indentation in `tags`
- unescaped special characters
- wrong image path

### 3. Does the referenced image actually exist?
Example:
```text
assets/posts/2026/times-new-ramen.png
```

### 4. Did the push reach GitHub?
Check:
```bash
git status
git log --oneline -n 5
```

### 5. Did GitHub Actions succeed?
Check the repo’s Actions tab and the `Deploy to GitHub Pages` workflow.

### 6. Did the site deploy but not change visibly?
Possible causes:
- browser cache
- image path mismatch
- post date/order confusion
- wrong branch or repo remote

## Things that are intentionally simple right now

This repo currently has almost no moving parts beyond static site generation.
There is no database, no CMS, no server-side app, and no API layer in the site itself.
That simplicity is a feature.

## Good candidate improvements

These are reasonable next steps that fit the current architecture:
- improve `scripts/new-post.mjs` to also copy/rename images
- add linting or frontmatter validation
- add Open Graph/Twitter/Bluesky-friendly metadata per post
- add richer tags or filtering
- add a post body field for extra commentary if desired
- automate cross-posting to social after publish

## Planned social-post echo integration

The likely clean design is:

1. **Canonical publish remains the site repo**
   - add screenshot + markdown post
   - push to `main`
   - GitHub Pages publishes

2. **Social echo triggers after publish**
   - probably via GitHub Actions
   - use the post metadata already present in the markdown file

3. **Targets**
   - **Bluesky** via AtProto client/library or direct API calls
   - **Mastodon** via its normal REST API

4. **Secrets**
   - store credentials in GitHub Actions secrets
   - do not hardcode tokens in the repo

5. **Suggested behavior for v1**
   - detect the newly added post
   - post caption + Tuesday comment + link
   - optional image attachment later if the API flow is worth it

6. **Why this approach is sane**
   - one canonical source of truth
   - low operational complexity
   - easy to debug from Git history and Actions logs
   - no separate publishing app required

## Operational notes for future-us

When editing or expanding this repo, keep these principles:
- the site should stay easy to understand after two cocktails
- content files should remain the source of truth
- prefer boring automation over clever automation
- if a workflow becomes magical, document it immediately

## Quick reference

### Build locally
```bash
npm run build
```

### Run local server
```bash
npm run dev
```

### Scaffold a new post file
```bash
node scripts/new-post.mjs "Title" "Caption"
```

### Publish
```bash
git add .
git commit -m "Add new exhibit"
git push
```

## Status of this document

This README is intended to be the primary “how this contraption works” note for the repo.
If the architecture grows more complex later, split detailed operational docs into a `docs/` directory and keep this file as the front door.