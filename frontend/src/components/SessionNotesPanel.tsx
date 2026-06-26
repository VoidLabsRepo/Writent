"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PipelineTracker } from "@/components/PipelineTracker";
import { SocialPreview } from "@/components/social/SocialPreview";
import type { ArticleDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SessionNotesPanelProps {
  article: ArticleDetail;
  stepDetails?: Record<string, string>;
}

type Tab = "article" | "pipeline" | "social";

export function SessionNotesPanel({ article, stepDetails = {} }: SessionNotesPanelProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "article", label: "Article" },
    { id: "pipeline", label: "Pipeline" },
    { id: "social", label: "Social" },
  ];

  const [activeTab, setActiveTab] = useState<Tab>(article.status === "completed" ? "article" : article.status === "in_progress" ? "pipeline" : "article");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
              activeTab === tab.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "article" && (
          <ArticleContent article={article} />
        )}
        {activeTab === "pipeline" && (
          <PipelineContent article={article} stepDetails={stepDetails} />
        )}
        {activeTab === "social" && (
          <div className="chat-markdown">
            <SocialPreview posts={article.social_posts as any} />
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleContent({ article }: { article: ArticleDetail }) {
  if (article.status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No article yet</p>
          <p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-normal mt-1">
            Tell the AI what you want to write about in the chat, then say &ldquo;start&rdquo; to begin.
          </p>
        </div>
      </div>
    );
  }

  if (article.status === "in_progress" && !article.content_markdown) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Writing in progress...</p>
          <p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-normal mt-1">
            The AI is researching and writing your article.
          </p>
        </div>
      </div>
    );
  }

  if (!article.content_markdown) {
    return (
      <div className="text-muted-foreground text-sm italic text-center py-12">
        Article will appear here as it&apos;s being written...
      </div>
    );
  }

  return (
    <div className="chat-markdown">
      <Markdown remarkPlugins={[remarkGfm]}>{article.content_markdown}</Markdown>
    </div>
  );
}

function PipelineContent({ article, stepDetails = {} }: { article: ArticleDetail; stepDetails?: Record<string, string> }) {
  if (article.status === "pending") {
    return (
      <div className="text-muted-foreground text-sm italic text-center py-12">
        Pipeline will start once you confirm the topic in chat.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-xs font-medium",
            article.status === "completed"
              ? "bg-emerald-500/10 text-emerald-600"
              : article.status === "in_progress"
              ? "bg-amber-500/10 text-amber-600"
              : article.status === "error"
              ? "bg-red-500/10 text-red-600"
              : "bg-muted text-muted-foreground"
          )}>
            {article.status === "in_progress" ? article.current_step || "processing" : article.status}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {article.article_mode === "deep_research" ? "Deep Research" : article.article_mode === "serious" ? "Serious" : "Casual"}
          </span>
        </div>
      </div>

      <PipelineTracker
        steps={(article.pipeline_steps || []).map((s) => ({
          ...s,
          status: s.status as "pending" | "in_progress" | "completed" | "error",
          details: stepDetails[s.id] || undefined,
        }))}
      />
    </div>
  );
}
