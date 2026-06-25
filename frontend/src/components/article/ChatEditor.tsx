import { useState } from "react";
import { chatAboutArticle } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChatEditorProps {
  articleId: string;
  currentContent: string;
  onUpdated: (content: string) => void;
}

export function ChatEditor({ articleId, currentContent, onUpdated }: ChatEditorProps) {
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
