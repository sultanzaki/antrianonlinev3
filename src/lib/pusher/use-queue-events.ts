"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { getPusherClient } from "./client";
import { QUEUE_CHANNEL, TICKET_EVENT, type TicketEventPayload } from "./events";

/**
 * Subscribe to the global queue channel. Silently does nothing if Pusher
 * isn't configured yet (no NEXT_PUBLIC_PUSHER_KEY) — callers should also
 * poll on an interval as a fallback, both for that case and for missed
 * events.
 */
export function useQueueEvents(onEvent: (payload: TicketEventPayload) => void) {
  const handlerRef = useRef(onEvent);

  useLayoutEffect(() => {
    handlerRef.current = onEvent;
  });

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;

    try {
      const client = getPusherClient();
      const channel = client.subscribe(QUEUE_CHANNEL);
      const handler = (payload: TicketEventPayload) => handlerRef.current(payload);
      channel.bind(TICKET_EVENT, handler);

      return () => {
        channel.unbind(TICKET_EVENT, handler);
        client.unsubscribe(QUEUE_CHANNEL);
      };
    } catch (err) {
      console.error("Pusher subscribe failed", err);
    }
  }, []);
}
