import { useRouter } from "next/navigation";
import type { ArticleList } from "@/lib/types";
import { MODE_CONFIG, STATUS_COLORS } from "@/lib/types";
import { formatDate, cn } from "@/lib/utils";

interface ArticleCardProps {
  article: ArticleList;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export function ArticleCard({ article, onDelete }: ArticleCardProps) {
  const router = useRouter();
  const mode = article.article_mode || "deep_research";
  const modeInfo = MODE_CONFIG[mode];

  return (
    <div
      onClick={() => router.push(`/article/${article.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/article/${article.id}`)}
      className="text-left p-5 bg-surface-900 border border-surface-800 rounded-xl hover:border-surface-600 hover:bg-surface-800/80 transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className={cn(
            "px-2.5 py-0.5 rounded-full text-xs font-medium",
            STATUS_COLORS[article.status]
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
              modeInfo.color
            )}
          >
            {modeInfo.label}
          </span>
          <button
            onClick={(e) => onDelete(e, article.id)}
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
    </div>
  );
}
