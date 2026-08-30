"use client";

import PusherClient from "pusher-js";

let pusherClientSingleton: PusherClient | undefined;

/** Lazily creates (and reuses) the browser Pusher client instance. */
export function getPusherClient() {
  if (!pusherClientSingleton) {
    pusherClientSingleton = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! },
    );
  }
  return pusherClientSingleton;
}
