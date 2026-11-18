// PROTOTYPE, throwaway. Wayfinder ticket #23 (Notification Feed look & feel).
// Signs a short-lived RS256 Knock user token so the browser can read and
// update only the current DevUI user's feed. No JWT dependency: it's three
// base64url segments and one RSA signature.
import { createSign } from "node:crypto";

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signKnockUserToken(userId: number, ttlSeconds = 60 * 60) {
  const pem = Buffer.from(process.env.KNOCK_SIGNING_KEY!, "base64").toString(
    "utf8"
  );
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ sub: String(userId), iat: now, exp: now + ttlSeconds })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  return `${header}.${payload}.${b64url(signer.sign(pem))}`;
}

export function getKnockFeedConfig(userId: number | null) {
  if (!userId) return null;
  return {
    userId: String(userId),
    publicKey: process.env.KNOCK_PUBLIC_API_KEY!,
    channelId: process.env.KNOCK_FEED_CHANNEL_ID!,
    userToken: signKnockUserToken(userId),
  };
}
