/**
 * Server-only Web Push sender. Uses @block65/webcrypto-web-push which is
 * compatible with the Cloudflare Worker runtime (pure Web Crypto).
 *
 * Import inside handler bodies only, never at module scope of a
 * .functions.ts file (server-only module).
 */
import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { PushMessage, PushSubscription } from "@block65/webcrypto-web-push";

export type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

function vapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:notifications@habitify.app";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  return { publicKey, privateKey, subject };
}

/**
 * Sends the same payload to every provided subscription. Returns per-endpoint
 * results so callers can prune dead subscriptions (410/404).
 */
export async function sendPushToMany(
  subs: StoredSubscription[],
  payload: PushNotificationPayload,
): Promise<{
  sent: number;
  failed: number;
  gone: string[]; // endpoints that returned 404/410 — safe to delete
}> {
  if (subs.length === 0) return { sent: 0, failed: 0, gone: [] };
  const vapid = vapidKeys();
  const message: PushMessage = {
    data: JSON.stringify(payload),
    options: { ttl: 60 * 60 * 24, urgency: "normal" },
  };

  let sent = 0;
  let failed = 0;
  const gone: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      const pushSub: PushSubscription = {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: { auth: sub.auth, p256dh: sub.p256dh },
      };
      try {
        const built = await buildPushPayload(message, pushSub, vapid);
        const res = await fetch(sub.endpoint, {
          method: built.method,
          headers: built.headers,
          body: built.body.buffer as ArrayBuffer,
        });

        if (res.status === 404 || res.status === 410) {
          gone.push(sub.endpoint);
          failed++;
          return;
        }
        if (!res.ok) {
          failed++;
          console.warn(
            `[push] ${res.status} for endpoint ${sub.endpoint.slice(0, 60)}…`,
          );
          return;
        }
        sent++;
      } catch (err) {
        failed++;
        console.warn("[push] send error", err);
      }
    }),
  );

  return { sent, failed, gone };
}
