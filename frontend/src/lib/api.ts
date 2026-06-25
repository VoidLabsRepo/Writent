import type { ArticleList, ArticleDetail, ArticleMode } from "./types";

const API_BASE = "/api";

export async function fetchArticles(): Promise<ArticleList[]> {
  const res = await fetch(`${API_BASE}/articles`);
  if (!res.ok) throw new Error("Failed to fetch articles");
  return res.json();
}

export async function fetchArticle(id: string): Promise<ArticleDetail> {
  const res = await fetch(`${API_BASE}/articles/${id}`);
  if (!res.ok) throw new Error("Failed to fetch article");
  return res.json();
}

export async function createArticle(
  topic: string,
  customInstructions?: string,
  articleMode: ArticleMode = "deep_research"
): Promise<ArticleList> {
  const res = await fetch(`${API_BASE}/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      custom_instructions: customInstructions,
      article_mode: articleMode,
    }),
  });
  if (!res.ok) throw new Error("Failed to create article");
  return res.json();
}

export function getWsUrl(articleId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:4006/ws/articles/${articleId}`;
}

export async function chatAboutArticle(
  articleId: string,
  message: string
): Promise<{ status: string; changes: string; content: string }> {
  const res = await fetch(`${API_BASE}/articles/${articleId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Chat failed");
  return res.json();
}

export async function stopArticle(articleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/articles/${articleId}/stop`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to stop");
}

export async function deleteArticle(articleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/articles/${articleId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
}
