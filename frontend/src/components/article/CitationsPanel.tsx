import type { Citation } from "@/lib/types";

interface CitationsPanelProps {
  citations: Citation[] | null;
}

export function CitationsPanel({ citations }: CitationsPanelProps) {
  if (!citations || citations.length === 0) {
    return (
      <div className="text-surface-600 italic text-center py-12">
        Citations will be collected during research...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {citations.map((c, i) => (
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
      ))}
    </div>
  );
}
