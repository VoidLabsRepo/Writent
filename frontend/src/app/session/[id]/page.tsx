"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { getSession } from "@/lib/api";
import type { ArticleDetail } from "@/lib/types";
import { SessionChatPanel } from "@/components/SessionChatPanel";
import { SessionNotesPanel } from "@/components/SessionNotesPanel";
import { SidebarToggleIcon } from "@/components/unlumen-ui/sidebar-toggle-icon";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useWebSocket } from "@/hooks/useWebSocket";

const panelVariants = {
  hidden: {
    width: 0,
    opacity: 0,
    scale: 0.95,
    x: 40,
  },
  visible: {
    width: "40%",
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
      mass: 0.8,
      opacity: { duration: 0.25, ease: "easeOut" as const },
    },
  },
  exit: {
    width: 0,
    opacity: 0,
    scale: 0.95,
    x: 40,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
      mass: 0.6,
      opacity: { duration: 0.2, ease: "easeIn" as const },
    },
  },
};

const mobilePanelVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 35 },
  },
};

const chatVariants = {
  wide: { flex: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  full: { flex: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

const contentVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
      delay: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function NotesPanel({
  article,
  notesOpen,
  isMobile,
  onClose,
}: {
  article: ArticleDetail;
  notesOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
}) {
  if (isMobile) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/30 z-40"
        />
        <motion.aside
          variants={mobilePanelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-x-0 bottom-0 top-12 bg-white rounded-t-2xl border-t overflow-hidden flex flex-col z-50"
        >
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-base font-medium text-muted-foreground">Output</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <SidebarToggleIcon isOpen={true} className="size-5" />
            </button>
          </div>
          <SessionNotesPanel article={article} />
        </motion.aside>
      </>
    );
  }

  return (
    <motion.aside
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="shrink-0 bg-white rounded-2xl border overflow-hidden flex flex-col min-w-0"
    >
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="h-full flex flex-col"
      >
        <div className="px-5 py-4 border-b">
          <h2 className="text-base font-medium text-muted-foreground">Output</h2>
        </div>
        <SessionNotesPanel article={article} />
      </motion.div>
    </motion.aside>
  );
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [notesOpen, setNotesOpen] = useState(true);
  const [stepDetails, setStepDetails] = useState<Record<string, string>>({});
  const [searchStatus, setSearchStatus] = useState<{ query?: string; url?: string; status: string } | null>(null);
  const isMobile = useIsMobile();

  const handleWsUpdate = useCallback(
    (update: any) => {
      if (update.type === "chat_search") {
        setSearchStatus({
          query: update.query,
          url: update.url,
          status: update.status,
        });
        if (update.status === "done" || update.status === "fallback") {
          setTimeout(() => setSearchStatus(null), 2000);
        }
        return;
      }
      if (update.type === "step_update" && update.step && update.data?.details) {
        setStepDetails((prev) => ({
          ...prev,
          [update.step!]: update.data!.details as string,
        }));
      }
      if (update.type === "step_update" && update.step && update.status && update.status !== "in_progress") {
        setStepDetails((prev) => {
          const next = { ...prev };
          delete next[update.step!];
          return next;
        });
      }
      if (update.type === "step_update" || update.type === "state" || update.type === "article_updated") {
        getSession(id).then(setArticle).catch(console.error);
      }
    },
    [id]
  );

  useWebSocket(id, handleWsUpdate);

  useEffect(() => {
    getSession(id)
      .then(setArticle)
      .catch(() => router.push("/"));
  }, [id, router]);

  const closeNotes = useCallback(() => setNotesOpen(false), []);

  if (!article) {
    return (
      <div className="h-dvh flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-dvh bg-[#f0f0f0] flex flex-col overflow-hidden font-sans">
      <header className="h-12 flex items-center px-4 md:px-5 shrink-0 gap-3">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <SidebarToggleIcon isOpen={notesOpen} className="size-6" />
        </button>
      </header>

      <div className="flex-1 flex gap-3 md:gap-5 overflow-hidden px-3 md:px-5 pb-3 md:pb-5">
        {/* Chat area */}
        <div className={`${notesOpen && !isMobile ? "flex-1" : "w-full"} min-w-0 min-h-0 bg-white rounded-2xl border overflow-hidden flex flex-col transition-all duration-300`}>
          <SessionChatPanel article={article} onUpdated={setArticle} searchStatus={searchStatus} />
        </div>

        {/* Notes/Output panel */}
        {notesOpen && !isMobile && (
          <div className="w-[40%] shrink-0 bg-white rounded-2xl border overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b">
              <h2 className="text-base font-medium text-muted-foreground">Output</h2>
            </div>
            <SessionNotesPanel article={article} stepDetails={stepDetails} />
          </div>
        )}

        {/* Mobile notes sheet */}
        {notesOpen && isMobile && (
          <>
            <div onClick={closeNotes} className="fixed inset-0 bg-black/30 z-40" />
            <div className="fixed inset-x-0 bottom-0 top-12 bg-white rounded-t-2xl border-t overflow-hidden flex flex-col z-50">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="text-base font-medium text-muted-foreground">Output</h2>
                <button onClick={closeNotes} className="text-muted-foreground hover:text-foreground">
                  <SidebarToggleIcon isOpen={true} className="size-5" />
                </button>
              </div>
              <SessionNotesPanel article={article} stepDetails={stepDetails} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
