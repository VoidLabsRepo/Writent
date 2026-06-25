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
      <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
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
    <div className="w-6 h-6 rounded-full border-2 border-surface-600 flex items-center justify-center">
      <div className="w-1.5 h-1.5 rounded-full bg-surface-600" />
    </div>
  );
}

export function PipelineTracker({ steps, compact = false }: PipelineTrackerProps) {
  return (
    <div className={cn("space-y-0", compact && "space-y-0")}>
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-start gap-3">
          {/* Vertical line + icon */}
          <div className="flex flex-col items-center">
            <StepIcon status={step.status} />
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-0.5 h-8",
                  step.status === "completed"
                    ? "bg-brand-500"
                    : step.status === "in_progress"
                    ? "bg-gradient-to-b from-amber-400 to-surface-700"
                    : "bg-surface-700"
                )}
              />
            )}
          </div>

          {/* Content */}
          <div className={cn("pb-6 -mt-0.5", compact && "pb-4")}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  step.status === "completed"
                    ? "text-brand-400"
                    : step.status === "in_progress"
                    ? "text-amber-400"
                    : step.status === "error"
                    ? "text-red-400"
                    : "text-surface-500"
                )}
              >
                {step.name}
              </span>
              {step.status === "in_progress" && (
                <span className="text-xs text-amber-400/60 animate-pulse">
                  running...
                </span>
              )}
            </div>
            {!compact && (
              <>
                <p className="text-xs text-surface-500 mt-0.5">
                  {step.description}
                </p>
                {step.status === "in_progress" && step.details && (
                  <p className="text-xs text-amber-400/80 mt-1 font-mono truncate max-w-[200px]">
                    {step.details}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
