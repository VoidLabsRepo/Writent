"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getWsUrl } from "@/lib/api";

interface StepUpdate {
  type: "step_update" | "state";
  step?: string;
  status?: string;
  data?: Record<string, unknown>;
}

export function useWebSocket(
  articleId: string | null,
  onUpdate: (update: StepUpdate) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!articleId) return;

    const ws = new WebSocket(getWsUrl(articleId));

    ws.onopen = () => {
      setConnected(true);
      ws.send("get_state");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StepUpdate;
        onUpdate(data);
      } catch {
        console.error("Failed to parse WebSocket message");
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [articleId, onUpdate]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
