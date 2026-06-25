import type { ArticleDetail } from "@/lib/types";

interface ResearchPanelProps {
  research_data: ArticleDetail["research_data"];
  media: ArticleDetail["media"];
}

export function ResearchPanel({ research_data, media }: ResearchPanelProps) {
  return (
    <div className="space-y-6">
      {research_data ? (
        <div>
          {typeof research_data === "object" &&
            Object.entries(research_data).map(([key, value]) => (
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

      {media && media.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-brand-400 uppercase tracking-wider mb-3">
            Found Media ({media.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {media.map((m, i) => (
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
  );
}
