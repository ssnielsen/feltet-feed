import type { Article } from "./types.ts";

const ARTICLE_URL_TEMPLATE =
  "https://www.feltet.dk/x/x/{id}/__data.json";

function resolveString(data: unknown[], idx: number): string {
  const v = data[idx];
  return typeof v === "string" ? v : String(v ?? "");
}

export async function fetchArticle(id: string): Promise<Article | null> {
  const url = ARTICLE_URL_TEMPLATE.replace("{id}", id);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Article ${id}: HTTP ${res.status}`);
      return null;
    }

    const text = await res.text();
    const firstLine = text.split("\n")[0];
    const json = JSON.parse(firstLine);

    // Find the node with article-specific data (has metaData and article keys)
    let data: unknown[] | null = null;
    for (const node of json.nodes) {
      if (node?.data?.[0]?.metaData !== undefined) {
        data = node.data;
        break;
      }
    }
    if (!data) {
      console.error(`Article ${id}: no data node found`);
      return null;
    }

    const keymap = data[0] as Record<string, number>;

    // metaData has title, description, articlePublishTime
    const metaData = data[keymap.metaData] as Record<string, number>;
    const title = resolveString(data, metaData.title);
    const description = resolveString(data, metaData.description);
    const published = resolveString(data, metaData.articlePublishTime);

    // article object has url, tags, sections
    const articleObj = data[keymap.article] as Record<string, number | string>;

    // url might be stored directly as string or as index
    let articleUrl: string;
    if (typeof articleObj.url === "number") {
      articleUrl = resolveString(data, articleObj.url);
    } else {
      articleUrl = String(articleObj.url);
    }

    // tags
    const tags: string[] = [];
    if (typeof keymap.tags === "number") {
      const tagList = data[keymap.tags];
      if (Array.isArray(tagList)) {
        for (const tagIdx of tagList) {
          const tagObj = data[tagIdx as number] as Record<string, number>;
          if (tagObj?.name !== undefined) {
            tags.push(resolveString(data, tagObj.name));
          }
        }
      }
    }

    // articleImage
    let imageUrl: string | null = null;
    if (keymap.articleImage !== undefined) {
      const imgData = data[keymap.articleImage];
      if (typeof imgData === "string" && imgData.startsWith("http")) {
        imageUrl = imgData;
      } else if (typeof imgData === "number") {
        const imgStr = resolveString(data, imgData);
        if (imgStr.startsWith("http")) imageUrl = imgStr;
      }
    }

    return {
      id,
      title,
      url: articleUrl,
      description,
      published,
      tags,
      imageUrl,
    };
  } catch (e) {
    console.error(`Article ${id}: fetch error:`, e);
    return null;
  }
}
