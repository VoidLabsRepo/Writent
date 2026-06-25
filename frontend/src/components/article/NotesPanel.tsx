import type { ArticleDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NotesPanelProps {
  notes: ArticleDetail["notes"];
}

export function NotesPanel({ notes }: NotesPanelProps) {
  if (!notes) {
    return (
      <div className="text-surface-600 italic text-center py-12">
        Research notes will appear here once the AI analyzes the topic...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notes.summary && (
        <div className="bg-surface-800/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-2">
            Research Strategy
          </h3>
          <p className="text-sm text-surface-300">{notes.summary}</p>
        </div>
      )}

      {notes.angles?.map((angle, i) => (
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
    </div>
  );
}
