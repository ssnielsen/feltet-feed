import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fetchHomepage } from "./fetch-homepage.ts";
import { fetchArticle } from "./fetch-article.ts";
import { buildRss } from "./build-rss.ts";
import type { FeedState, Article } from "./types.ts";

const STATE_PATH = "feed-state.json";
const FEED_PATH = "docs/feed.xml";
const FEED_URL =
  "https://ssnielsen.github.io/feltet-feed/feed.xml";
const MAX_NEW_FETCHES = 15;
const FETCH_DELAY_MS = 2000;
const MAX_AGE_DAYS = 30;

function loadState(): FeedState {
  if (existsSync(STATE_PATH)) {
    return JSON.parse(readFileSync(STATE_PATH, "utf-8"));
  }
  return { lastRun: new Date().toISOString(), articles: {} };
}

function saveState(state: FeedState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

function pruneOldArticles(state: FeedState): void {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  for (const [id, article] of Object.entries(state.articles)) {
    if (new Date(article.published).getTime() < cutoff) {
      delete state.articles[id];
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(id: string): Promise<Article | null> {
  let article = await fetchArticle(id);
  if (!article) {
    await sleep(FETCH_DELAY_MS);
    article = await fetchArticle(id);
  }
  return article;
}

async function main() {
  console.log("Starting feed generation...");

  const state = loadState();

  // Fetch homepage
  const { aboveTheFoldArticles, articleIds } = await fetchHomepage();

  // Add above-the-fold articles directly to state
  for (const article of aboveTheFoldArticles) {
    state.articles[article.id] = article;
  }

  // Find new article IDs not already in state
  const allIds = new Set([
    ...articleIds,
    ...aboveTheFoldArticles.map((a) => a.id),
  ]);
  const newIds = [...allIds].filter((id) => !(id in state.articles));
  console.log(`Found ${newIds.length} new articles to fetch`);

  // Fetch new articles (capped)
  const toFetch = newIds.slice(0, MAX_NEW_FETCHES);
  let fetched = 0;
  for (const id of toFetch) {
    if (fetched > 0) await sleep(FETCH_DELAY_MS);
    const article = await fetchWithRetry(id);
    if (article) {
      state.articles[article.id] = article;
      console.log(`  Fetched: ${article.title}`);
    }
    fetched++;
  }

  // Prune old articles
  pruneOldArticles(state);

  // Update state
  state.lastRun = new Date().toISOString();
  const articleList = Object.values(state.articles);
  console.log(`Total articles in state: ${articleList.length}`);

  // Generate RSS
  const rss = buildRss(articleList, FEED_URL);
  writeFileSync(FEED_PATH, rss);
  console.log(`Written ${FEED_PATH}`);

  // Save state
  saveState(state);
  console.log("Done.");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
