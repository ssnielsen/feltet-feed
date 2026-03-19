export interface Article {
  id: string;
  title: string;
  url: string;
  description: string;
  published: string;
  tags: string[];
  imageUrl: string | null;
}

export interface FeedState {
  lastRun: string;
  articles: Record<string, Article>;
}
