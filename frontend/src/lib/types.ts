export type ArticleMode = "casual" | "serious" | "deep_research";

export type ArticleStatus = "pending" | "in_progress" | "completed" | "error";

export interface ArticleList {
  id: string;
  topic: string;
  title: string | null;
  article_mode: ArticleMode;
  status: ArticleStatus;
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

export const MODE_CONFIG: Record<ArticleMode, { label: string; color: string; description: string }> = {
  casual: { label: "Casual", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30", description: "Personal blog post, 1500–2500 words" },
  serious: { label: "Serious", color: "bg-blue-500/10 text-blue-400 border border-blue-500/30", description: "Focused topic coverage, 2500–4000 words" },
  deep_research: { label: "Deep Research", color: "bg-purple-500/10 text-purple-400 border border-purple-500/30", description: "Full research pipeline, 4000–6000 words" },
};

export const STATUS_COLORS: Record<ArticleStatus, string> = {
  pending: "bg-surface-700 text-surface-300",
  in_progress: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  completed: "bg-brand-500/10 text-brand-400 border border-brand-500/30",
  error: "bg-red-500/10 text-red-400 border border-red-500/30",
};
