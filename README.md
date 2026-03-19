# feltet.dk RSS Feed

Unofficial RSS feed for [feltet.dk](https://www.feltet.dk), a Danish cycling news site that no longer publishes its own feed.

**Feed URL:** https://ssnielsen.github.io/feltet-feed/feed.xml

## How it works

A TypeScript script runs every 15 minutes via GitHub Actions. It fetches article data from feltet.dk's SvelteKit `__data.json` endpoints, tracks seen articles in `feed-state.json`, and generates a static RSS 2.0 feed served via GitHub Pages.

- Above-the-fold articles are extracted with full metadata from the homepage
- New article IDs are fetched individually (max 15 per run, 2s delay between requests)
- Articles older than 30 days are pruned from the feed

## Running locally

```sh
yarn install
node --experimental-strip-types src/generate.ts
```

Requires Node.js 24+.
