import cardsData from "../data/cards.json" assert { type: "json" };
import relicsData from "../data/relics.json" assert { type: "json" };
import enemiesData from "../data/enemies.json" assert { type: "json" };
import eventsData from "../data/events.json" assert { type: "json" };
import { seededShuffle, choose } from "../engine/random.js";

export const CARD_LIBRARY = cardsData;
export const RELIC_LIBRARY = relicsData;
export const ENEMY_LIBRARY = enemiesData;
export const EVENT_LIBRARY = eventsData;

export function createInitialState(rng, modifierHand = 0) {
  const deck = [
    ...Array(5 + modifierHand).fill("strike"),
    ...Array(5 + modifierHand).fill("defend"),
    "nova",
    "star_draw"
  ];
  const shuffled = seededShuffle([...deck], rng);
  return {
    player: {
      maxHp: 70,
      hp: 70,
      block: 0,
      energy: 3,
      energyPerTurn: 3,
      strength: 0,
      plating: 0,
      powers: {},
      hand: [],
      drawPile: [...shuffled],
      discardPile: [],
      exhaustPile: [],
      statuses: {}
    },
    relics: [],
    gold: 99,
    potions: [],
    map: [],
    nodeIndex: 0,
    path: [],
    modifierHand,
    runSeed: null,
    ghostLog: [],
    startDeck: deck,
    unlocked: { cards: ["supernova", "meteor"], relics: ["meteor_core"] }
  };
}

export function createEnemy(type, rng) {
  const pool = type === "elite" ? ENEMY_LIBRARY.elite : ENEMY_LIBRARY.normal;
  const template = choose(pool, rng);
  return {
    ...template,
    hp: template.hp,
    maxHp: template.hp,
    block: 0,
    intentIndex: 0,
    statuses: {}
  };
}

export function getCardDefinition(id) {
  return CARD_LIBRARY.find((card) => card.id === id);
}

export function getRelicDefinition(id) {
  return RELIC_LIBRARY.find((relic) => relic.id === id);
}

export function getEventDefinition(id) {
  return EVENT_LIBRARY.find((event) => event.id === id);
}
