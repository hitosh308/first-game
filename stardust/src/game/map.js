import { choose } from "../engine/random.js";

const NODE_TYPES = ["battle", "event", "shop", "treasure", "elite"];

export function generateMap(rng) {
  const floors = 10;
  const map = [];
  for (let i = 0; i < floors; i++) {
    const options = [];
    const optionsCount = i === floors - 1 ? 1 : 3;
    for (let j = 0; j < optionsCount; j++) {
      const type = i === floors - 1 ? "boss" : choose(NODE_TYPES, rng);
      options.push({
        id: `${i}-${j}`,
        type,
        visited: false
      });
    }
    map.push(options);
  }
  return map;
}

export function getCurrentOptions(map, nodeIndex) {
  return map[nodeIndex] || [];
}
