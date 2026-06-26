"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendMessage, startPipeline } from "@/lib/api";
import { ThinkingIndicator } from "@/components/ui/thinking-indicator";
import { Send, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArticleDetail, ArticleMode } from "@/lib/types";

interface SessionChatPanelProps {
  article: ArticleDetail;
  onUpdated: (article: ArticleDetail) => void;
  searchStatus?: { query?: string; url?: string; status: string } | null;
}

const MODE_OPTIONS: { value: ArticleMode; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "serious", label: "Serious" },
  { value: "deep_research", label: "Deep Research" },
];

export function SessionChatPanel({ article, onUpdated, searchStatus }: SessionChatPanelProps) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    article.conversation_history || []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ArticleMode>(article.article_mode || "deep_research");
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [pipelineStarted, setPipelineStarted] = useState(article.status !== "pending");
  const bottomRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isBusy = loading || (searchStatus && searchStatus.status !== "done" && searchStatus.status !== "fallback");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, searchStatus]);

  useEffect(() => {
    if (article.conversation_history && article.conversation_history.length > 0) {
      setMessages(article.conversation_history);
    }
  }, [article.conversation_history]);

  useEffect(() => {
    if (article.status !== "pending") {
      setPipelineStarted(true);
    }
  }, [article.status]);

  useEffect(() => {
    if (modeDropdownOpen === null) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [modeDropdownOpen]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isBusy) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const response = await sendMessage(article.id, msg, mode);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);

      if (!pipelineStarted && isStartSignal(msg)) {
        const topic = extractTopic(messages, msg);
        await startPipeline(article.id, topic, mode, buildInstructions(messages, msg));
        setPipelineStarted(true);
        onUpdated({ ...article, status: "in_progress", topic, article_mode: mode });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to get response. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, isBusy, article, mode, messages, pipelineStarted, onUpdated]);

  const hasContent = input.trim().length > 0;

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-base">
            What do you want to write about?
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-5 py-3 text-[15px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-muted"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="chat-markdown">
                  <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {isBusy && (
          <div className="flex justify-start py-2">
            <ThinkingIndicator
              searchUrl={searchStatus?.status === "browsing" ? searchStatus.url : null}
            />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className={cn("px-3 md:px-5 pb-3 md:pb-5 shrink-0 transition-opacity", isBusy && "opacity-50 pointer-events-none")}>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex-1 flex flex-col border rounded-2xl bg-white min-w-0">
            <div className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3`}>
              {/* Mode dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                  disabled={isBusy}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 transition-colors text-muted-foreground shrink-0 disabled:opacity-50"
                >
                  {MODE_OPTIONS.find((m) => m.value === mode)?.label}
                  <ChevronDown size={12} />
                </button>
                {modeDropdownOpen && (
                  <div className="absolute bottom-full mb-1 left-0 w-40 rounded-xl border border-border bg-background shadow-md z-20 py-1">
                    {MODE_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        className={cn(
                          "flex items-center w-full px-3 py-2 text-sm transition-colors",
                          mode === m.value
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                        onClick={() => {
                          setMode(m.value);
                          setModeDropdownOpen(false);
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isBusy && handleSend()}
                placeholder={isBusy ? "AI is thinking..." : pipelineStarted ? "Ask about your article..." : "Tell me what you want to write about..."}
                disabled={isBusy}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm md:text-base placeholder:text-muted-foreground disabled:cursor-not-allowed"
              />
              <button
                onClick={() => handleSend()}
                disabled={isBusy || !hasContent}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-30 shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function isStartSignal(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("start") ||
    lower.includes("go") ||
    lower.includes("begin") ||
    lower.includes("proceed") ||
    lower.includes("write it") ||
    lower.includes("let's go") ||
    lower === "go"
  );
}

function extractTopic(messages: { role: string; content: string }[], lastUserMsg: string): string {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
  if (userMessages.length <= 1) return lastUserMsg;
  return userMessages[0];
}

function buildInstructions(messages: { role: string; content: string }[], lastUserMsg: string): string | undefined {
  if (messages.length <= 2) return undefined;
  return messages
    .filter((m) => m.role === "user")
    .slice(1)
    .map((m) => m.content)
    .join("\n");
}
