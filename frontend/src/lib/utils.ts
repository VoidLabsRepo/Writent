import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Unknown date";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "Unknown date";
  }
}

export function getStepColor(status: string) {
  switch (status) {
    case "completed":
      return "text-brand-400 bg-brand-500/10 border-brand-500/30";
    case "in_progress":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "error":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    default:
      return "text-surface-500 bg-surface-800/50 border-surface-700/30";
  }
}

export function getStepIcon(status: string) {
  switch (status) {
    case "completed":
      return "check";
    case "in_progress":
      return "spinner";
    case "error":
      return "error";
    default:
      return "pending";
  }
}
