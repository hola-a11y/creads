// Storage adapter compatible with the original `window.storage` interface:
//   get(key, shared) -> { value: string } | null
//   set(key, value, shared) -> void   (value is an already-stringified JSON)
//
// Primary backend: the /api/storage serverless function (Vercel KV), so state
// is SHARED across every player and the admin. If the API is unreachable
// (e.g. `vite dev` without `vercel dev`, or KV not yet connected), it falls
// back to localStorage so the UI keeps working on a single device.

const LS_PREFIX = "quiniela:";

function lsGet(key) {
  try {
    const value = localStorage.getItem(LS_PREFIX + key);
    return value == null ? null : { value };
  } catch {
    return null;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(LS_PREFIX + key, value);
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export const storage = {
  async get(key /*, shared */) {
    try {
      const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (data && data.value != null) {
        // keep the local mirror warm for offline fallback
        lsSet(key, data.value);
        return { value: data.value };
      }
      return null;
    } catch {
      return lsGet(key);
    }
  },

  async set(key, value /*, shared */) {
    // mirror locally first so the UI is responsive even if the network is slow
    lsSet(key, value);
    try {
      const res = await fetch("/api/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      return true;
    } catch {
      // localStorage already has it; report failure so the UI can warn the user
      return false;
    }
  },
};
