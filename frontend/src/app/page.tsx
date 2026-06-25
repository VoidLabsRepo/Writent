"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchArticles, createArticle, deleteArticle, type ArticleList, type ArticleMode } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { PipelineTracker } from "@/components/pipeline/PipelineTracker";

export default function Dashboard() {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleList[]>([]);
  const [topic, setTopic] = useState("");
  const [instructions, setInstructions] = useState("");
  const [articleMode, setArticleMode] = useState<ArticleMode>("deep_research");
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    loadArticles();
    const interval = setInterval(loadArticles, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadArticles() {
    try {
      const data = await fetchArticles();
      setArticles(data);
    } catch {
      console.error("Failed to load articles");
    }
  }

  async function handleCreate() {
    if (!topic.trim()) return;
    setCreating(true);
    try {
      const article = await createArticle(topic, instructions || undefined, articleMode);
      router.push(`/article/${article.id}`);
    } catch {
      alert("Failed to create article");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, articleId: string) {
    e.stopPropagation();
    if (!confirm("Delete this article?")) return;
    try {
      await deleteArticle(articleId);
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
    } catch {
      alert("Failed to delete article");
    }
  }

  const statusColors = {
    pending: "bg-surface-700 text-surface-300",
    in_progress: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    completed: "bg-brand-500/10 text-brand-400 border border-brand-500/30",
    error: "bg-red-500/10 text-red-400 border border-red-500/30",
  };

  const modeLabels: Record<ArticleMode, { label: string; color: string }> = {
    casual: { label: "Casual", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" },
    serious: { label: "Serious", color: "bg-blue-500/10 text-blue-400 border border-blue-500/30" },
    deep_research: { label: "Deep Research", color: "bg-purple-500/10 text-purple-400 border border-purple-500/30" },
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-white mb-3">
          Write articles that{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
            matter
          </span>
        </h1>
        <p className="text-surface-400 text-lg max-w-2xl mx-auto">
          Multi-agent AI researches, writes, reviews, and formats publication-ready articles.
          No AI slop. Just quality.
        </p>
      </div>

      {/* New Article */}
      {!showNewForm ? (
        <div className="flex justify-center">
          <button
            onClick={() => setShowNewForm(true)}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-brand-600/20 hover:shadow-brand-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            + New Article
          </button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-surface-900 border border-surface-700/50 rounded-2xl p-6 space-y-4 animate-slide-up">
          <h2 className="text-lg font-semibold text-white">Start Writing</h2>
          <div>
            <label className="block text-sm text-surface-400 mb-1.5">
              What do you want to write about?
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Why Rust is taking over systems programming"
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
              onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1.5">
              Writing mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "casual" as ArticleMode, label: "Casual", desc: "Personal blog post, 1500–2500 words" },
                { value: "serious" as ArticleMode, label: "Serious", desc: "Focused topic coverage, 2500–4000 words" },
                { value: "deep_research" as ArticleMode, label: "Deep Research", desc: "Full research pipeline, 4000–6000 words" },
              ]).map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setArticleMode(mode.value)}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-left transition-all duration-200 border",
                    articleMode === mode.value
                      ? "bg-brand-600/10 border-brand-500/50 text-brand-400"
                      : "bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600 hover:text-surface-300"
                  )}
                >
                  <div className="text-sm font-medium">{mode.label}</div>
                  <div className="text-xs text-surface-500 mt-0.5">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-1.5">
              Custom instructions{" "}
              <span className="text-surface-600">(optional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Focus on the developer experience, include comparisons with Go"
              rows={2}
              className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={!topic.trim() || creating}
              className={cn(
                "px-6 py-2.5 rounded-xl font-medium transition-all duration-200",
                topic.trim() && !creating
                  ? "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20"
                  : "bg-surface-800 text-surface-500 cursor-not-allowed"
              )}
            >
              {creating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Starting pipeline...
                </span>
              ) : (
                "Start Writing"
              )}
            </button>
            <button
              onClick={() => {
                setShowNewForm(false);
                setTopic("");
                setInstructions("");
                setArticleMode("deep_research");
              }}
              className="px-6 py-2.5 rounded-xl font-medium text-surface-400 hover:text-white hover:bg-surface-800 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Articles Grid */}
      {articles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Your Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article) => (
              <button
                key={article.id}
                onClick={() => router.push(`/article/${article.id}`)}
                className="text-left p-5 bg-surface-900 border border-surface-800 rounded-xl hover:border-surface-600 hover:bg-surface-800/80 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-medium",
                      statusColors[article.status]
                    )}
                  >
                    {article.status === "in_progress"
                      ? article.current_step || "processing"
                      : article.status}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-medium",
                        modeLabels[article.article_mode || "deep_research"].color
                      )}
                    >
                      {modeLabels[article.article_mode || "deep_research"].label}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, article.id)}
                      className="p-1 rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete article"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <h3 className="text-white font-medium mb-1 group-hover:text-brand-400 transition-colors line-clamp-2">
                  {article.title || article.topic}
                </h3>
                <p className="text-sm text-surface-500 line-clamp-2">
                  {article.topic}
                </p>
                <div className="mt-3 text-xs text-surface-600">
                  {formatDate(article.created_at)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {articles.length === 0 && !showNewForm && (
        <div className="text-center py-20 text-surface-600">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          <p className="text-lg">No articles yet</p>
          <p className="text-sm mt-1">
            Click &ldquo;New Article&rdquo; to get started
          </p>
        </div>
      )}
    </div>
  );
}
