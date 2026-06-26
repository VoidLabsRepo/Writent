import type { ArticleList, ArticleDetail, ArticleMode } from "./types";

const API_BASE = "/api";

export interface SessionListItem {
  id: string;
  topic: string;
  title: string;
  article_mode: ArticleMode;
  status: string;
  created_at: string;
}

export async function listSessions(): Promise<SessionListItem[]> {
  const res = await fetch(`${API_BASE}/articles`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  const articles: ArticleList[] = await res.json();
  return articles.map((a) => ({
    id: a.id,
    topic: a.topic,
    title: a.title || a.topic,
    article_mode: a.article_mode,
    status: a.status,
    created_at: a.created_at,
  }));
}

export async function createSession(): Promise<SessionListItem> {
  const res = await fetch(`${API_BASE}/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "New session",
      article_mode: "deep_research",
    }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  const article: ArticleList = await res.json();
  return {
    id: article.id,
    topic: article.topic,
    title: article.title || article.topic,
    article_mode: article.article_mode,
    status: article.status,
    created_at: article.created_at,
  };
}

export async function getSession(id: string): Promise<ArticleDetail> {
  const res = await fetch(`${API_BASE}/articles/${id}`);
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

export async function renameSession(id: string, title: string): Promise<void> {
  const res = await fetch(`${API_BASE}/articles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to rename session");
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/articles/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete session");
}

export async function sendMessage(
  articleId: string,
  message: string,
  mode?: ArticleMode
): Promise<string> {
  const res = await fetch(`${API_BASE}/articles/${articleId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, article_mode: mode }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  const data = await res.json();
  return data.response || data.content || data.message || "";
}

export async function startPipeline(
  articleId: string,
  topic: string,
  mode: ArticleMode,
  customInstructions?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/articles/${articleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      article_mode: mode,
      custom_instructions: customInstructions,
      start_pipeline: true,
    }),
  });
  if (!res.ok) throw new Error("Failed to start pipeline");
}

export function getWsUrl(articleId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:4006/ws/articles/${articleId}`;
}

export async function stopArticle(articleId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/articles/${articleId}/stop`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to stop");
}
