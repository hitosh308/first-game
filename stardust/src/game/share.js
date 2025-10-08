export function encodeRun({ seed, modifier, deck }) {
  const payload = JSON.stringify({ seed, modifier, deck });
  return btoa(payload).replace(/=+$/, "");
}

export function decodeRun(token) {
  try {
    const payload = JSON.parse(atob(token));
    return payload;
  } catch (err) {
    console.warn("Failed to decode run token", err);
    return null;
  }
}

export function encodeGhost(log) {
  const compressed = JSON.stringify(log);
  return btoa(compressed);
}

export function decodeGhost(token) {
  try {
    return JSON.parse(atob(token));
  } catch (err) {
    return [];
  }
}
