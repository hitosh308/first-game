import { createInitialState } from "./state.js";
import { Battle } from "./battle.js";
import { generateMap } from "./map.js";
import { saveGame, loadGame, saveMeta, loadMeta } from "../save/indexedDb.js";
import { hashStringToSeed, mulberry32 } from "../engine/random.js";
import { encodeRun, encodeGhost } from "./share.js";
import { track } from "../engine/analytics.js";

export class RunManager {
  constructor(localization, audio, settings) {
    this.localization = localization;
    this.audio = audio;
    this.settings = settings;
    this.state = null;
    this.battle = null;
    this.meta = {
      stardust: 0,
      unlocks: {
        cards: [],
        relics: []
      }
    };
    this.seedValue = Date.now();
    this.rng = mulberry32(this.seedValue);
    this.daily = false;
    this.modifier = null;
  }

  async init() {
    this.meta = (await loadMeta()) || this.meta;
    track("meta_loaded", this.meta);
  }

  async newRun(seed, modifier) {
    this.modifier = modifier;
    if (!seed) {
      seed = Math.floor(Math.random() * 1e9).toString();
    }
    this.daily = Boolean(modifier && modifier.id === "daily");
    const hashSeed = await hashStringToSeed(seed);
    this.seedValue = hashSeed;
    this.rng = mulberry32(this.seedValue);
    this.state = createInitialState(this.rng, modifier?.handBonus || 0);
    this.state.runSeed = seed;
    this.state.map = generateMap(this.rng);
    this.battle = new Battle(this.state, this.rng, this.audio, this.localization, this.settings);
    await saveGame(this.serialize());
    track("run_start", { seed, modifier });
  }

  async loadRun() {
    const data = await loadGame();
    if (!data) return false;
    Object.assign(this, data);
    this.localization = window.localization;
    this.audio = window.audioManager;
    this.seedValue = data.seedValue || Date.now();
    this.rng = mulberry32(this.seedValue);
    this.battle = new Battle(this.state, this.rng, this.audio, this.localization, this.settings);
    track("run_loaded", { seed: this.state.runSeed });
    return true;
  }

  serialize() {
    return {
      state: this.state,
      modifier: this.modifier,
      seedValue: this.seedValue,
      meta: this.meta
    };
  }

  async save() {
    await saveGame(this.serialize());
  }

  async completeRun(victory) {
    const reward = victory ? 30 : 10;
    this.meta.stardust += reward;
    await saveMeta(this.meta);
    const token = encodeRun({ seed: this.state.runSeed, modifier: this.modifier, deck: this.state.startDeck });
    const ghost = encodeGhost(this.state.ghostLog);
    await saveGame(null);
    track("run_complete", { victory, reward });
    return { reward, token, ghost };
  }
}
