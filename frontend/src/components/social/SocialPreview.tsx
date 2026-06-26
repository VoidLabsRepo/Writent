"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SocialPosts {
  x?: {
    content?: string;
    tweets?: string[];
    type?: string;
    hashtags?: string[];
  };
  linkedin?: {
    content?: string;
    hashtags?: string[];
  };
  threads?: {
    content?: string;
  };
}

interface SocialPreviewProps {
  posts: SocialPosts | null;
}

type Platform = "x" | "linkedin" | "threads";

export function SocialPreview({ posts }: SocialPreviewProps) {
  const [active, setActive] = useState<Platform>("x");

  if (!posts) {
    return (
      <div className="text-muted-foreground italic py-8 text-center text-sm">
        Social media posts will be generated after the article is written...
      </div>
    );
  }

  const platforms: { id: Platform; label: string; icon: string }[] = [
    { id: "x", label: "X / Twitter", icon: "\u2717" },
    { id: "linkedin", label: "LinkedIn", icon: "in" },
    { id: "threads", label: "Threads", icon: "@" },
  ];

  function renderXPost() {
    const x = posts?.x;
    if (!x) return null;
    const tweets = x.tweets || [x.content || ""];
    return (
      <div className="space-y-3">
        {tweets.map((tweet, i) => (
          <div key={i} className="bg-white rounded-xl p-4 text-black text-sm border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-foreground flex-shrink-0" />
              <div>
                <div className="font-bold text-sm">Writent</div>
                <div className="text-muted-foreground text-xs">@writent_ai</div>
                <div className="mt-1 whitespace-pre-wrap">{tweet}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderLinkedInPost() {
    const li = posts?.linkedin;
    if (!li) return null;
    return (
      <div className="bg-white rounded-xl p-4 text-black border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-foreground flex-shrink-0" />
          <div>
            <div className="font-bold text-sm">Writent</div>
            <div className="text-muted-foreground text-xs">AI Article Writer</div>
            <div className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
              {li.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderThreadsPost() {
    const th = posts?.threads;
    if (!th) return null;
    return (
      <div className="bg-white rounded-xl p-4 text-black border">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-foreground flex-shrink-0" />
          <div>
            <div className="font-bold text-sm">writent</div>
            <div className="mt-1 text-sm whitespace-pre-wrap">
              {th.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-4">
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className={cn(
              "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
              active === p.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="mr-1.5">{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>

      {active === "x" && renderXPost()}
      {active === "linkedin" && renderLinkedInPost()}
      {active === "threads" && renderThreadsPost()}

      <button
        onClick={() => {
          const data = posts?.[active];
          const text =
            active === "x"
              ? ((data as any)?.tweets || [(data as any)?.content]).join("\n\n---\n\n")
              : (data as any)?.content || "";
          navigator.clipboard.writeText(text);
        }}
        className="mt-4 px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-all flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy to clipboard
      </button>
    </div>
  );
}
