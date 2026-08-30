import "server-only";
import PusherServer from "pusher";

declare global {
  var pusherServerGlobal: PusherServer | undefined;
}

function createPusherServer() {
  return new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
  });
}

// Reuse a single instance across hot reloads in dev.
export const pusherServer = globalThis.pusherServerGlobal ?? createPusherServer();

if (process.env.NODE_ENV !== "production") {
  globalThis.pusherServerGlobal = pusherServer;
}
