"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/** Runs `callback` immediately and then every `intervalMs`. */
export function usePolling(callback: () => void, intervalMs: number) {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    callbackRef.current();
    const id = setInterval(() => callbackRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
