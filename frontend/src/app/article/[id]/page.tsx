"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { fetchArticle, chatAboutArticle, stopArticle, type ArticleDetail, type ArticleMode, type PipelineStep } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { PipelineTracker } from "@/components/pipeline/PipelineTracker";
import { ArticlePreview } from "@/components/editor/ArticlePreview";
import { SocialPreview } from "@/components/social-preview/SocialPreview";
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

        // Store details for in_progress steps
        if (update.status === "in_progress" && update.data?.details) {
          setStepDetails((prev) => ({
            ...prev,
            [update.step!]: update.data!.details as string,
          }));
        }
        // Clear details when step completes
        if (update.status === "completed" || update.status === "error") {
          setStepDetails((prev) => {
            const next = { ...prev };
            delete next[update.step!];
            return next;
          });
        }

        // Refresh article data on completion
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
        // Only sync steps from server if pipeline is not running
        // to avoid overwriting live WebSocket updates
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

  const steps = liveSteps.length > 0 ? liveSteps : article.pipeline_steps;
  const isRunning = article.status === "in_progress";

  const modeConfig: Record<ArticleMode, { label: string; color: string }> = {
    casual: { label: "Casual", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" },
    serious: { label: "Serious", color: "bg-blue-500/10 text-blue-400 border border-blue-500/30" },
    deep_research: { label: "Deep Research", color: "bg-purple-500/10 text-purple-400 border border-purple-500/30" },
  };
  const mode = article.article_mode || "deep_research";
  const modeInfo = modeConfig[mode];

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "article", label: "Article" },
    { id: "notes", label: "Notes", badge: article.notes?.total_tasks },
    { id: "research", label: "Research" },
    {
      id: "citations",
      label: "Citations",
      badge: article.citations?.length,
    },
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
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  connected ? "bg-brand-400" : "bg-red-400"
                )}
              />
              <span className="text-xs text-surface-500">
                {connected ? "Live" : "Offline"}
              </span>
            </div>
          </div>

          <PipelineTracker
            steps={steps.map((s) => ({
              ...s,
              details: stepDetails[s.id],
            }))}
          />

          {/* Status card */}
          <div className="bg-surface-900 border border-surface-800 rounded-xl p-4">
            <div className="text-xs text-surface-500 mb-1">Status</div>
            <div
              className={cn(
                "text-sm font-medium",
                article.status === "completed"
                  ? "text-brand-400"
                  : article.status === "error"
                  ? "text-red-400"
                  : "text-amber-400"
              )}
            >
              {article.status === "in_progress"
                ? `Running — ${article.current_step || "..."}`
                : article.status}
            </div>
            <div className="text-xs text-surface-600 mt-2">
              Created {formatDate(article.created_at)}
            </div>
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
        {/* Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-white">
              {article.title || article.topic}
            </h1>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0", modeInfo.color)}>
              {modeInfo.label}
            </span>
          </div>
          {article.title && (
            <p className="text-surface-400">{article.topic}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-900 rounded-xl p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all relative",
                activeTab === tab.id
                  ? "bg-surface-700 text-white"
                  : "text-surface-400 hover:text-white"
              )}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-surface-600 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 min-h-[500px]">
          {/* Article tab */}
          {activeTab === "article" && (
            <ArticlePreview content={article.content_markdown || ""} />
          )}

          {/* Notes tab */}
          {activeTab === "notes" && (
            <div className="space-y-6">
              {article.notes ? (
                <>
                  {article.notes.summary && (
                    <div className="bg-surface-800/50 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-2">
                        Research Strategy
                      </h3>
                      <p className="text-sm text-surface-300">{article.notes.summary}</p>
                    </div>
                  )}

                  {article.notes.angles?.map((angle, i) => (
                    <div key={i} className="bg-surface-800/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white">{angle.name}</h3>
                        <span className="text-xs text-surface-500">
                          {angle.todos.length} task{angle.todos.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-xs text-surface-400 mb-3">{angle.description}</p>

                      <div className="space-y-2">
                        {angle.todos.map((todo, j) => (
                          <div
                            key={j}
                            className="flex items-start gap-2 p-2 bg-surface-900/50 rounded-lg"
                          >
                            <div
                              className={cn(
                                "mt-0.5 w-2 h-2 rounded-full shrink-0",
                                todo.priority === "high"
                                  ? "bg-red-400"
                                  : todo.priority === "medium"
                                  ? "bg-amber-400"
                                  : "bg-surface-500"
                              )}
                            />
                            <div className="min-w-0">
                              <p className="text-sm text-surface-200">{todo.task}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-surface-500">
                                  {todo.search_focus}
                                </span>
                                <span
                                  className={cn(
                                    "text-xs px-1.5 py-0.5 rounded",
                                    todo.agent_type === "search"
                                      ? "bg-blue-500/10 text-blue-400"
                                      : todo.agent_type === "browse"
                                      ? "bg-purple-500/10 text-purple-400"
                                      : "bg-surface-700 text-surface-400"
                                  )}
                                >
                                  {todo.agent_type}
                                </span>
                              </div>
                              {todo.expected_data && (
                                <p className="text-xs text-surface-500 mt-1 italic">
                                  Expected: {todo.expected_data}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-surface-600 italic text-center py-12">
                  Research notes will appear here once the AI analyzes the topic...
                </div>
              )}
            </div>
          )}

          {/* Research tab */}
          {activeTab === "research" && (
            <div className="space-y-6">
              {article.research_data ? (
                <div>
                  {typeof article.research_data === "object" &&
                    Object.entries(article.research_data).map(([key, value]) => (
                      <div key={key} className="mb-4">
                        <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-2">
                          {key.replace(/_/g, " ")}
                        </h3>
                        <div className="text-sm text-surface-300 whitespace-pre-wrap">
                          {typeof value === "string"
                            ? value
                            : JSON.stringify(value, null, 2)}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-surface-600 italic text-center py-12">
                  Research data will appear here as agents browse the web...
                </div>
              )}

              {/* Media */}
              {article.media && article.media.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-3">
                    Found Media ({article.media.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {article.media.map((m, i) => (
                      <div
                        key={i}
                        className="bg-surface-800 rounded-lg p-2 text-xs text-surface-400"
                      >
                        <span className="text-surface-300">{m.type}</span>
                        <p className="truncate mt-1">{m.alt_text || m.url}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Citations tab */}
          {activeTab === "citations" && (
            <div className="space-y-3">
              {article.citations && article.citations.length > 0 ? (
                article.citations.map((c, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 bg-surface-800/50 rounded-lg hover:bg-surface-800 transition-colors"
                  >
                    <span className="text-brand-400 font-mono text-sm font-bold">
                      [{c.number}]
                    </span>
                    <div className="min-w-0">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-brand-400 hover:text-brand-300 font-medium"
                      >
                        {c.title}
                      </a>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {c.source}
                      </p>
                      {c.snippet && (
                        <p className="text-xs text-surface-400 mt-1 line-clamp-2">
                          {c.snippet}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-surface-600 italic text-center py-12">
                  Citations will be collected during research...
                </div>
              )}
            </div>
          )}

          {/* Social tab */}
          {activeTab === "social" && (
            <SocialPreview posts={article.social_posts as any} />
          )}

          {/* Export tab */}
          {activeTab === "export" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Export Article</h3>

              {/* Medium */}
              <div className="bg-surface-800/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-white mb-2">
                  Medium
                </h4>
                <p className="text-xs text-surface-400 mb-3">
                  Copy the HTML below and paste into Medium&apos;s editor.
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(article.content_html || article.content_markdown || "");
                  }}
                  className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-all"
                >
                  Copy HTML for Medium
                </button>
              </div>

              {/* Markdown */}
              <div className="bg-surface-800/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-white mb-2">
                  Markdown
                </h4>
                <p className="text-xs text-surface-400 mb-3">
                  Raw Markdown for any platform.
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(article.content_markdown || "");
                  }}
                  className="px-4 py-2 text-sm bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-all"
                >
                  Copy Markdown
                </button>
              </div>

              {/* Preview */}
              {article.content_markdown && (
                <div className="bg-surface-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-white mb-2">
                    Preview
                  </h4>
                  <div className="max-h-96 overflow-y-auto bg-white rounded-lg p-6">
                    <div className="prose-writent text-black">
                      <ArticlePreview content={article.content_markdown} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat / Edit tab */}
          {activeTab === "chat" && (
            <ChatEditor
              articleId={id}
              currentContent={article.content_markdown || ""}
              onUpdated={(newContent) =>
                setArticle((prev) =>
                  prev ? { ...prev, content_markdown: newContent } : prev
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ChatEditor({
  articleId,
  currentContent,
  onUpdated,
}: {
  articleId: string;
  currentContent: string;
  onUpdated: (content: string) => void;
}) {
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = [
    "Add a section about real-world use cases",
    "Make the introduction more engaging",
    "Add a comparison table",
    "Rewrite the conclusion to be stronger",
    "Add more statistics and data points",
  ];

  async function handleSend(msg?: string) {
    const text = msg || input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await chatAboutArticle(articleId, text);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: `✅ ${res.changes}` },
      ]);
      if (res.content) onUpdated(res.content);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "❌ Failed to update article" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[500px]">
      <h3 className="text-lg font-semibold text-white mb-3">
        Edit Article with AI
      </h3>
      <p className="text-sm text-surface-400 mb-4">
        Tell the AI what to change — add sections, rewrite parts, adjust tone,
        etc.
      </p>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="px-3 py-1.5 text-xs bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-lg transition-all border border-surface-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "p-3 rounded-xl text-sm max-w-[85%]",
              m.role === "user"
                ? "bg-brand-600/20 text-brand-200 ml-auto"
                : "bg-surface-800 text-surface-200"
            )}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="bg-surface-800 text-surface-400 p-3 rounded-xl text-sm w-fit">
            <span className="animate-pulse">Editing article...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && handleSend()}
          placeholder="e.g. Add a comparison section with Go and C++"
          className="flex-1 px-4 py-2.5 bg-surface-800 border border-surface-700 rounded-xl text-white text-sm placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          disabled={loading}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className={cn(
            "px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
            input.trim() && !loading
              ? "bg-brand-600 hover:bg-brand-500 text-white"
              : "bg-surface-800 text-surface-500 cursor-not-allowed"
          )}
        >
          Send
        </button>
      </div>
    </div>
  );
}
