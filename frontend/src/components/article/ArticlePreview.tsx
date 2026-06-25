"use client";

import ReactMarkdown from "react-markdown";

interface ArticlePreviewProps {
  content: string;
}

export function ArticlePreview({ content }: ArticlePreviewProps) {
  if (!content) {
    return (
      <div className="text-surface-600 italic">
        Article will appear here as it&apos;s being written...
      </div>
    );
  }

  return (
    <div className="prose-writent max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
