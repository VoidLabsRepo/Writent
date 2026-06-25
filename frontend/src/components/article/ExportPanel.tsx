import { ArticlePreview } from "./ArticlePreview";

interface ExportPanelProps {
  content_markdown: string | null;
  content_html: string | null;
}

export function ExportPanel({ content_markdown, content_html }: ExportPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Export Article</h3>

      <div className="bg-surface-800/50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-white mb-2">Medium</h4>
        <p className="text-xs text-surface-400 mb-3">
          Copy the HTML below and paste into Medium&apos;s editor.
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(content_html || content_markdown || "");
          }}
          className="px-4 py-2 text-sm bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-all"
        >
          Copy HTML for Medium
        </button>
      </div>

      <div className="bg-surface-800/50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-white mb-2">Markdown</h4>
        <p className="text-xs text-surface-400 mb-3">
          Raw Markdown for any platform.
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText(content_markdown || "");
          }}
          className="px-4 py-2 text-sm bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-all"
        >
          Copy Markdown
        </button>
      </div>

      {content_markdown && (
        <div className="bg-surface-800/50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-white mb-2">Preview</h4>
          <div className="max-h-96 overflow-y-auto bg-white rounded-lg p-6">
            <div className="prose-writent text-black">
              <ArticlePreview content={content_markdown} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
