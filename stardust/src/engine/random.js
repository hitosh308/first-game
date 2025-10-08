const UINT32_MAX = 0xffffffff;

export async function hashStringToSeed(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const view = new DataView(hash);
  return view.getUint32(0, true);
}

export function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_MAX;
  };
}

export function seededShuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function choose(array, rng) {
  return array[Math.floor(rng() * array.length)];
}

export function weightedChoose(items, rng) {
  const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight || 1;
    if (roll <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}
