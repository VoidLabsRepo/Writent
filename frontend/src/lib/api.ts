const API_BASE = "/api";

export type ArticleMode = "casual" | "serious" | "deep_research";

export interface ArticleList {
  id: string;
  topic: string;
  title: string | null;
  article_mode: ArticleMode;
  status: "pending" | "in_progress" | "completed" | "error";
  current_step: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error";
}

export interface Citation {
  number: number;
  title: string;
  url: string;
  source: string;
  snippet: string;
}

export interface SocialPost {
  platform: string;
  content: string;
  tweets?: string[];
  hashtags?: string[];
  type?: string;
}

export interface ArticleDetail extends ArticleList {
  outline: Record<string, unknown> | null;
  content_markdown: string | null;
  content_html: string | null;
  research_data: Record<string, unknown> | null;
  notes: {
    angles?: {
      name: string;
      description: string;
      todos: {
        task: string;
        search_focus: string;
        priority: string;
        expected_data: string;
        agent_type: string;
      }[];
    }[];
    summary?: string;
    total_tasks?: number;
  } | null;
  citations: Citation[] | null;
  media: { url: string; type: string; alt_text: string }[] | null;
  social_posts: Record<string, SocialPost> | null;
  pipeline_steps: PipelineStep[];
}

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
