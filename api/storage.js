import { Redis } from "@upstash/redis";

// Build the Redis client from whichever env vars the connected store exposes.
// Vercel's Upstash / "KV" Marketplace integrations use either KV_REST_API_* or
// UPSTASH_REDIS_REST_* — accept both so connecting the store "just works".
function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// Keys are namespaced to avoid clashing with anything else in the store.
const NS = "quiniela:";

export default async function handler(req, res) {
  const redis = getRedis();
  if (!redis) {
    return res
      .status(503)
      .json({ error: "Redis store not configured (missing env vars)" });
  }

  try {
    if (req.method === "GET") {
      const key = req.query.key;
      if (!key) return res.status(400).json({ error: "missing key" });
      const value = await redis.get(NS + key);
      // We always store JSON strings; return them verbatim as { value }.
      return res.status(200).json({ value: value ?? null });
    }

    if (req.method === "POST") {
      const { key, value } = req.body || {};
      if (!key || typeof value !== "string") {
        return res.status(400).json({ error: "key and string value required" });
      }
      await redis.set(NS + key, value);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
