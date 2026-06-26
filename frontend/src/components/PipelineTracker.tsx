"use client";

import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error";
  details?: string;
}

interface PipelineTrackerProps {
  steps: Step[];
  compact?: boolean;
}

function StepIcon({ status }: { status: Step["status"] }) {
  if (status === "completed") {
    return (
      <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (status === "in_progress") {
    return (
      <div className="w-6 h-6 rounded-full border-2 border-amber-400 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-6 h-6 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
    </div>
  );
}

export function PipelineTracker({ steps, compact = false }: PipelineTrackerProps) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <StepIcon status={step.status} />
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-0.5 h-8",
                  step.status === "completed"
                    ? "bg-emerald-500"
                    : step.status === "in_progress"
                    ? "bg-gradient-to-b from-amber-400 to-border"
                    : "bg-border"
                )}
              />
            )}
          </div>

          <div className={cn("pb-6 -mt-0.5", compact && "pb-4")}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  step.status === "completed"
                    ? "text-emerald-600"
                    : step.status === "in_progress"
                    ? "text-amber-600"
                    : step.status === "error"
                    ? "text-red-600"
                    : "text-muted-foreground"
                )}
              >
                {step.name}
              </span>
              {step.status === "in_progress" && (
                <span className="text-xs text-amber-500 animate-pulse">
                  running...
                </span>
              )}
            </div>
            {!compact && (
              <>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
                {step.status === "in_progress" && step.details && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-md px-2 py-1 max-w-[240px]">
                    <svg className="w-3 h-3 shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <span className="truncate">{step.details}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
