import type { Article } from "./types.ts";

const HOMEPAGE_URL = "https://www.feltet.dk/__data.json";

interface HomepageResult {
  aboveTheFoldArticles: Article[];
  articleIds: string[];
}

/**
 * Resolve a value from the devalue data array. If the value at `idx` is an
 * integer index pointing elsewhere in the array, follow it. Otherwise return
 * the value directly.
 */
function resolve(data: unknown[], idx: number): unknown {
  return data[idx];
}

function resolveString(data: unknown[], idx: number): string {
  const v = resolve(data, idx);
  return typeof v === "string" ? v : String(v ?? "");
}

function parseAboveTheFoldArticle(
  data: unknown[],
  entryIdx: number
): Article | null {
  try {
    const entry = data[entryIdx] as Record<string, number>;
    const articleIdx = entry.article;
    const article = data[articleIdx] as Record<string, number>;

    const id = String(resolve(data, article.id));
    const title = resolveString(data, article.title);
    const url = resolveString(data, article.url);
    const published = resolveString(data, article.published);

    // subtitle is inside fieldValue
    const fieldValue = data[article.fieldValue] as Record<string, number>;
    const subtitleHtml = resolveString(data, fieldValue.subtitle);
    const description = subtitleHtml.replace(/<[^>]*>/g, "").trim();

    // tags
    const tags: string[] = [];
    const tagIndices = data[article.tag] as number[] | undefined;
    if (Array.isArray(tagIndices)) {
      for (const tagIdx of tagIndices) {
        const tagObj = data[tagIdx] as Record<string, number>;
        tags.push(resolveString(data, tagObj.name));
      }
    }

    // imageUrl from the entry (not the inner article)
    const imageUrl =
      typeof entry.imageUrl === "number"
        ? resolveString(data, entry.imageUrl)
        : null;

    return { id, title, url, description, published, tags, imageUrl };
  } catch (e) {
    console.error(`Failed to parse above-the-fold article at index ${entryIdx}:`, e);
    return null;
  }
}

export async function fetchHomepage(): Promise<HomepageResult> {
  const res = await fetch(HOMEPAGE_URL);
  if (!res.ok) throw new Error(`Homepage fetch failed: ${res.status}`);

  const text = await res.text();
  const firstLine = text.split("\n")[0];
  const json = JSON.parse(firstLine);

  // Find the node with page-specific data (has aboveTheFoldContent key)
  let data: unknown[] | null = null;
  for (const node of json.nodes) {
    if (node?.data?.[0]?.aboveTheFoldContent !== undefined) {
      data = node.data;
      break;
    }
  }
  if (!data) throw new Error("Could not find page data node");

  const keymap = data[0] as Record<string, number>;

  // Above-the-fold articles
  const atfIndices = data[keymap.aboveTheFoldContent] as number[];
  const aboveTheFoldArticles: Article[] = [];
  for (const idx of atfIndices) {
    const article = parseAboveTheFoldArticle(data, idx);
    if (article) aboveTheFoldArticles.push(article);
  }

  // mainLatestNews article IDs
  const frontpageLists = data[keymap.frontpageLists] as Record<string, number>;
  const mlnIndices = data[frontpageLists.mainLatestNews] as number[];
  const articleIds: string[] = [];
  for (const idx of mlnIndices) {
    const item = data[idx] as Record<string, number>;
    const id = String(resolve(data, item.id));
    articleIds.push(id);
  }

  console.log(
    `Homepage: ${aboveTheFoldArticles.length} above-the-fold, ${articleIds.length} latest IDs`
  );

  return { aboveTheFoldArticles, articleIds };
}
