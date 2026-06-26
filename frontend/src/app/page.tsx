"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listSessions, createSession, renameSession, deleteSession, type SessionListItem } from "@/lib/api";
import { MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    listSessions().then(setSessions).catch(console.error);
  }, []);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (menuOpenId === null) return;
    const handle = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [menuOpenId]);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((id: string) => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setMenuOpenId(id);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handleNewSession = async () => {
    setCreating(true);
    try {
      const session = await createSession();
      router.push(`/session/${session.id}`);
    } catch {
      alert("Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: string) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === sessions.find((s) => s.id === id)?.title) {
      setEditingId(null);
      return;
    }
    await renameSession(id, trimmed);
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="h-dvh bg-[#f0f0f0] flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="flex items-center gap-3 mb-6">
              <svg width="40" height="40" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="80" height="80" rx="16" fill="#0f172a"/>
                <path d="M40 12 L58 62 L50 62 L40 34 L30 62 L22 62 Z" fill="url(#writent-logo-g)"/>
                <rect x="18" y="50" width="44" height="4" rx="2" fill="#065f46"/>
                <defs>
                  <linearGradient id="writent-logo-g" x1="16" y1="8" x2="64" y2="72" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#34d399"/>
                    <stop offset="100%" stopColor="#059669"/>
                  </linearGradient>
                </defs>
              </svg>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Writent</h1>
            </div>
            <p className="text-muted-foreground text-base md:text-lg max-w-md mb-8">
              Multi-agent AI researches, writes, and formats publication-ready articles. No AI slop. Just quality.
            </p>
            <Button
              size="lg"
              className="rounded-full px-8 h-12 text-base font-medium"
              onClick={handleNewSession}
              disabled={creating}
            >
              {creating ? "Creating..." : "New Article"}
            </Button>
          </div>

          {sessions.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-4">Recent Sessions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="group relative flex flex-col rounded-3xl border border-border bg-surface h-64 transition-colors hover:border-border/80 select-none"
                    onPointerDown={() => handlePointerDown(s.id)}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  >
                    <div className="flex flex-col gap-3 px-5 pt-6 pb-4 flex-1">
                      {editingId === s.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(s.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            onBlur={() => handleRename(s.id)}
                            className="font-medium text-xl tracking-tight bg-transparent border-b border-foreground outline-none w-full"
                          />
                          <Button variant="ghost" size="icon-xs" onClick={() => handleRename(s.id)}>
                            <Check size={14} />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => setEditingId(null)}>
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <Link
                          href={`/session/${s.id}`}
                          className="font-medium text-xl tracking-tight text-foreground hover:underline line-clamp-2"
                          onClick={(e) => {
                            if (longPressTriggered.current) {
                              e.preventDefault();
                              longPressTriggered.current = false;
                            }
                          }}
                        >
                          {s.title || s.topic}
                        </Link>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {editingId !== s.id && (
                      <div
                        ref={menuOpenId === s.id ? menuRef : undefined}
                        className={cn(
                          "absolute top-3 right-3 transition-opacity",
                          menuOpenId === s.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setMenuOpenId(menuOpenId === s.id ? null : s.id)}
                        >
                          <MoreHorizontal size={14} />
                        </Button>

                        {menuOpenId === s.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-border bg-background shadow-md z-20 py-1">
                            <button
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              onClick={() => {
                                setMenuOpenId(null);
                                setEditingId(s.id);
                                setEditValue(s.title || s.topic);
                              }}
                            >
                              <Pencil size={14} /> Rename
                            </button>
                            <button
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                              onClick={() => {
                                setMenuOpenId(null);
                                setDeletingId(s.id);
                              }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {deletingId === s.id && (
                      <div className="absolute inset-0 rounded-3xl bg-surface/95 flex flex-col items-center justify-center gap-3 z-10">
                        <p className="text-sm text-muted-foreground">Delete this session?</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>
                            Cancel
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
