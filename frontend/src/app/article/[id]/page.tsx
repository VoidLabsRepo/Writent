"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { fetchArticle, stopArticle } from "@/lib/api";
import type { ArticleDetail, PipelineStep } from "@/lib/types";
import { MODE_CONFIG } from "@/lib/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import { PipelineTracker } from "@/components/PipelineTracker";
import { ArticlePreview } from "@/components/article/ArticlePreview";
import { SocialPreview } from "@/components/social/SocialPreview";
import { NotesPanel } from "@/components/article/NotesPanel";
import { ResearchPanel } from "@/components/article/ResearchPanel";
import { CitationsPanel } from "@/components/article/CitationsPanel";
import { ExportPanel } from "@/components/article/ExportPanel";
import { ChatEditor } from "@/components/article/ChatEditor";
import { formatDate, cn } from "@/lib/utils";

type Tab = "article" | "notes" | "research" | "citations" | "social" | "export" | "chat";

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("article");
  const [liveSteps, setLiveSteps] = useState<PipelineStep[]>([]);
  const [stepDetails, setStepDetails] = useState<Record<string, string>>({});

  const handleWsUpdate = useCallback(
    (update: { type: string; step?: string; status?: string; data?: Record<string, unknown> }) => {
      if (update.type === "step_update" && update.step && update.status) {
        setLiveSteps((prev) => {
          const steps = [...prev];
          const idx = steps.findIndex((s) => s.id === update.step);
          if (idx >= 0) {
            steps[idx] = { ...steps[idx], status: update.status as PipelineStep["status"] };
          }
          return steps;
        });

        if (update.status === "in_progress" && update.data?.details) {
          setStepDetails((prev) => ({
            ...prev,
            [update.step!]: update.data!.details as string,
          }));
        }
        if (update.status === "completed" || update.status === "error") {
          setStepDetails((prev) => {
            const next = { ...prev };
            delete next[update.step!];
            return next;
          });
        }

        if (update.status === "completed" || update.status === "error") {
          fetchArticle(id).then(setArticle).catch(console.error);
        }
      }

      if (update.type === "state" && update.data) {
        fetchArticle(id).then(setArticle).catch(console.error);
      }
    },
    [id]
  );

  const { connected } = useWebSocket(id, handleWsUpdate);

  useEffect(() => {
    fetchArticle(id)
      .then((data) => {
        setArticle(data);
        setLiveSteps(data.pipeline_steps);
      })
      .catch(console.error);

    const interval = setInterval(() => {
      fetchArticle(id).then((data) => {
        setArticle(data);
        if (data.status !== "in_progress") {
          setLiveSteps(data.pipeline_steps);
        }
      }).catch(console.error);
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  if (!article) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-surface-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading article...
        </div>
      </div>
    );
  }

  const steps = (liveSteps ?? []).length > 0 ? liveSteps : article.pipeline_steps ?? [];
  const mode = article.article_mode || "deep_research";
  const modeInfo = MODE_CONFIG[mode];

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "article", label: "Article" },
    { id: "notes", label: "Notes", badge: article.notes?.total_tasks },
    { id: "research", label: "Research" },
    { id: "citations", label: "Citations", badge: article.citations?.length },
    { id: "social", label: "Social" },
    { id: "export", label: "Export" },
    { id: "chat", label: "✏️ Edit" },
  ];

  return (
    <div className="grid grid-cols-12 gap-6 animate-fade-in">
      {/* Left sidebar — Pipeline */}
      <div className="col-span-3">
        <div className="sticky top-24 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider">
              Pipeline
            </h2>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", connected ? "bg-brand-400" : "bg-red-400")} />
              <span className="text-xs text-surface-500">{connected ? "Live" : "Offline"}</span>
            </div>
          </div>

          <PipelineTracker steps={steps.map((s) => ({ ...s, details: stepDetails[s.id] }))} />

          <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
            <div className="text-xs text-surface-500 mb-1">Status</div>
            <div className={cn(
              "text-sm font-medium",
              article.status === "completed" ? "text-brand-400"
                : article.status === "error" ? "text-red-400"
                : "text-amber-400"
            )}>
              {article.status === "in_progress" ? `Running — ${article.current_step || "..."}` : article.status}
            </div>
            <div className="text-xs text-surface-600 mt-2">Created {formatDate(article.created_at)}</div>
            {article.status === "in_progress" && (
              <button
                onClick={async () => {
                  await stopArticle(id);
                  fetchArticle(id).then(setArticle).catch(console.error);
                }}
                className="mt-3 w-full px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-all"
              >
                Stop Pipeline
              </button>
            )}
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full px-4 py-2 text-sm text-surface-400 hover:text-white bg-surface-800 hover:bg-surface-700 rounded-lg transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="col-span-9">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-white">{article.title || article.topic}</h1>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0", modeInfo.color)}>
              {modeInfo.label}
            </span>
          </div>
          {article.title && <p className="text-surface-400">{article.topic}</p>}
        </div>

        <div className="flex gap-1 bg-surface-900 rounded-xl p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all relative",
                activeTab === tab.id ? "bg-surface-700 text-white" : "text-surface-400 hover:text-white"
              )}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-surface-600 rounded-full">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 min-h-[500px]">
          {activeTab === "article" && <ArticlePreview content={article.content_markdown || ""} />}
          {activeTab === "notes" && <NotesPanel notes={article.notes} />}
          {activeTab === "research" && <ResearchPanel research_data={article.research_data} media={article.media} />}
          {activeTab === "citations" && <CitationsPanel citations={article.citations} />}
          {activeTab === "social" && <SocialPreview posts={article.social_posts as any} />}
          {activeTab === "export" && <ExportPanel content_markdown={article.content_markdown} content_html={article.content_html} />}
          {activeTab === "chat" && (
            <ChatEditor
              articleId={id}
              currentContent={article.content_markdown || ""}
              onUpdated={(newContent) => setArticle((prev) => prev ? { ...prev, content_markdown: newContent } : prev)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
