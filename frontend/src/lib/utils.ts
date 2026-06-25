import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function stepColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-brand-400";
    case "in_progress":
      return "text-amber-400";
    case "error":
      return "text-red-400";
    default:
      return "text-surface-500";
  }
}

export function stepIcon(status: string): string {
  switch (status) {
    case "completed":
      return "✓";
    case "in_progress":
      return "●";
    case "error":
      return "✕";
    default:
      return "○";
  }
}
