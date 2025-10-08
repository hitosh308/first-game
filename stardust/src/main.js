import { Localization } from "./engine/localization.js";
import { AudioManager } from "./engine/audio.js";
import { RunManager } from "./game/run.js";
import { CARD_LIBRARY, RELIC_LIBRARY, getCardDefinition } from "./game/state.js";
import { decodeRun, decodeGhost } from "./game/share.js";
import { hashStringToSeed, mulberry32, seededShuffle } from "./engine/random.js";
import { track } from "./engine/analytics.js";

const scene = document.getElementById("scene");
const toast = document.getElementById("toast");
const tutorialBox = document.getElementById("tutorial");
const metaBox = document.getElementById("meta");

const settings = {
  volume: 0.7,
  muted: false,
  fontSize: 16,
  colorblind: false,
  highContrast: false,
  reducedMotion: false
};

const localization = new Localization("en");
window.localization = localization;

const audioManager = new AudioManager(settings);
window.audioManager = audioManager;

const runManager = new RunManager(localization, audioManager, settings);

let currentScene = "title";
let dailySeed = null;
let ghostReplay = [];
let ghostIndex = 0;
let ghostReady = false;
let lastResult = null;

async function setup() {
  await localization.load(navigator.language.startsWith("ja") ? "ja" : "en");
  await runManager.init();
  updateSettingsUI();
  await audioManager.init();
  prepareDaily();
  bindUI();
  renderTitle();
  applyLocalization();
  loadMeta();
  checkHash();
}

function loadMeta() {
  const { stardust } = runManager.meta;
  metaBox.textContent = `${localization.t("ui.reward.gold")}: ${runManager.state?.gold || 0} | ${localization.t("ui.meta.stardust")}: ${stardust}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

function bindUI() {
  document.getElementById("start-btn").addEventListener("click", async () => {
    await runManager.newRun(null, null);
    runManager.state.map = runManager.state.map;
    loadMeta();
    currentScene = "map";
    renderMap();
  });

  document.getElementById("daily-btn").addEventListener("click", async () => {
    if (!dailySeed) return;
    await runManager.newRun(dailySeed, { id: "daily", handBonus: 1 });
    loadMeta();
    currentScene = "map";
    renderMap();
  });

  document.getElementById("load-btn").addEventListener("click", async () => {
    const loaded = await runManager.loadRun();
    if (loaded) {
      loadMeta();
      currentScene = "map";
      renderMap();
    } else {
      showToast("No save found");
    }
  });

  document.getElementById("language-select").addEventListener("change", async (event) => {
    await localization.load(event.target.value);
    applyLocalization();
    renderCurrentScene();
  });

  document.getElementById("volume-range").addEventListener("input", (event) => {
    settings.volume = Number(event.target.value);
    audioManager.updateVolume();
  });

  document.getElementById("font-range").addEventListener("input", (event) => {
    settings.fontSize = Number(event.target.value);
    document.documentElement.style.setProperty("--font-size", `${settings.fontSize}px`);
  });

  document.getElementById("palette-toggle").addEventListener("change", (event) => {
    settings.colorblind = event.target.checked;
    document.body.classList.toggle("colorblind", settings.colorblind);
  });

  document.getElementById("contrast-toggle").addEventListener("change", (event) => {
    settings.highContrast = event.target.checked;
    document.body.classList.toggle("contrast", settings.highContrast);
  });

  document.getElementById("motion-toggle").addEventListener("change", (event) => {
    settings.reducedMotion = event.target.checked;
    document.body.classList.toggle("reduced-motion", settings.reducedMotion);
  });

  document.getElementById("mute-toggle").addEventListener("change", (event) => {
    settings.muted = event.target.checked;
    audioManager.updateVolume();
  });
}

function applyLocalization() {
  document.getElementById("start-btn").textContent = localization.t("ui.start");
  document.getElementById("daily-btn").textContent = localization.t("ui.daily");
  document.getElementById("load-btn").textContent = localization.t("ui.load");
  document.getElementById("settings-title").textContent = localization.t("ui.settings");
  document.getElementById("language-label").textContent = localization.t("ui.language");
  document.getElementById("volume-label").textContent = localization.t("ui.volume");
  document.getElementById("font-label").textContent = localization.t("ui.fontSize");
  document.getElementById("palette-label").textContent = localization.t("ui.colorblind");
  document.getElementById("contrast-label").textContent = localization.t("ui.highContrast");
  document.getElementById("motion-label").textContent = localization.t("ui.reducedMotion");
  document.getElementById("mute-label").textContent = localization.t("ui.mute");
  document.getElementById("title").textContent = localization.t("ui.title");
}

function renderTitle() {
  scene.innerHTML = `<div class="title-screen"><p>${localization.t("tutorial.map")}</p></div>`;
  tutorialBox.innerHTML = `${localization.t("tutorial.battle")}<br>${localization.t("tutorial.shop")}<br>${localization.t("tutorial.result")}`;
}

function renderCurrentScene() {
  switch (currentScene) {
    case "map":
      renderMap();
      break;
    case "battle":
      renderBattle();
      break;
    case "reward":
      renderRewards();
      break;
    case "shop":
      renderShop();
      break;
    case "event":
      renderEvent();
      break;
    case "result":
      renderResult();
      break;
    default:
      renderTitle();
  }
}

function renderMap() {
  currentScene = "map";
  const options = runManager.state.map[runManager.state.nodeIndex] || [];
  scene.innerHTML = `<div id="map"></div>`;
  const mapEl = document.getElementById("map");
  options.forEach((node) => {
    const nodeEl = document.createElement("div");
    nodeEl.className = `map-node ${node.visited ? "visited" : ""}`;
    nodeEl.textContent = localization.t(`ui.${node.type}`) || node.type;
    nodeEl.addEventListener("click", () => handleNode(node));
    mapEl.appendChild(nodeEl);
  });
  tutorialBox.textContent = localization.t("tutorial.map");
}

function handleNode(node) {
  track("map_select", { node });
  node.visited = true;
  runManager.save();
  switch (node.type) {
    case "battle":
    case "elite":
      runManager.battle.start(node.type);
      prepareGhost(runManager.battle.enemy.id);
      currentScene = "battle";
      renderBattle();
      break;
    case "event":
      currentScene = "event";
      renderEvent();
      break;
    case "shop":
      currentScene = "shop";
      renderShop();
      break;
    case "treasure":
      gainRelic();
      break;
    case "boss":
      runManager.battle.start("elite");
      currentScene = "battle";
      renderBattle();
      break;
  }
}

function gainRelic() {
  const relic = RELIC_LIBRARY[Math.floor(Math.random() * RELIC_LIBRARY.length)];
  if (!runManager.state.relics.includes(relic.id)) {
    runManager.state.relics.push(relic.id);
    showToast(localization.t(relic.nameKey));
  }
  runManager.state.gold += relic.effect === "extraGold" ? relic.value : 0;
  goNextNode();
}

function renderBattle() {
  const { player } = runManager.state;
  const enemy = runManager.battle.enemy;
  const enemyName = enemy.nameKey ? localization.t(enemy.nameKey) : enemy.id;
  scene.innerHTML = `
    <div id="battle">
      <div id="enemy-intent"></div>
      <div class="status">
        <p>${localization.t("ui.battle")} - HP ${player.hp}/${player.maxHp} - Energy ${player.energy}</p>
        <p>${enemyName}</p>
      </div>
      <div class="potions"></div>
      <div class="hands"></div>
      <div class="actions">
        <button id="end-turn">${localization.t("ui.endTurn")}</button>
        ${ghostReady ? `<button id="play-ghost">${localization.t("ui.ghost")}</button>` : ""}
      </div>
    </div>
  `;
  const intentEl = document.getElementById("enemy-intent");
  const intent = runManager.battle.getIntent();
  intentEl.textContent = `${intent.type} ${intent.value || ""}`;
  const potionEl = scene.querySelector(".potions");
  potionEl.innerHTML = runManager.state.potions
    .map((potion, index) => `<button data-index="${index}" class="potion">${localization.t("ui.shop.potion")} +${potion.value}</button>`)
    .join("");
  potionEl.querySelectorAll(".potion").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.getAttribute("data-index"));
      const potion = runManager.state.potions.splice(index, 1)[0];
      if (potion) {
        runManager.state.player.hp = Math.min(runManager.state.player.maxHp, runManager.state.player.hp + potion.value);
        showToast(localization.t("ui.shop.potion"));
        runManager.save();
        renderBattle();
      }
    });
  });
  const handEl = scene.querySelector(".hands");
  player.hand.forEach((cardId, index) => {
    const card = getCardDefinition(cardId);
    const cardEl = document.createElement("div");
    cardEl.className = `card ${card.type}`;
    cardEl.innerHTML = `<h3>${localization.t(card.nameKey)}</h3><p>${localization.t(card.descriptionKey, card)}</p><p>${card.cost} ⚡</p>`;
    cardEl.addEventListener("click", () => {
      if (runManager.battle.playCard(cardId, enemy)) {
        runManager.save();
        renderBattle();
      }
    });
    cardEl.setAttribute("data-shortcut", index + 1);
    handEl.appendChild(cardEl);
  });
  document.getElementById("end-turn").addEventListener("click", () => {
    runManager.battle.enemyTurn();
    runManager.battle.nextTurn();
    runManager.save();
    renderBattle();
  });
  if (ghostReady) {
    document.getElementById("play-ghost").addEventListener("click", () => {
      playGhostAction();
    });
  }
  tutorialBox.textContent = localization.t("tutorial.battle");
  checkBattleOutcome();
}

function checkBattleOutcome() {
  if (runManager.battle.enemy.hp <= 0) {
    const rewardGold = 20;
    runManager.state.gold += rewardGold;
    runManager.save();
    currentScene = "reward";
    renderRewards();
  } else if (runManager.state.player.hp <= 0) {
    concludeRun(false);
  }
}

function renderRewards() {
  currentScene = "reward";
  const rng = mulberry32(Date.now());
  const options = seededShuffle([...CARD_LIBRARY], rng).slice(0, 3 + (runManager.state.relics.includes("cosmic_lens") ? 1 : 0));
  scene.innerHTML = `<div class="reward"><h2>${localization.t("ui.reward")}</h2><div class="reward-cards"></div><button id="skip-reward">${localization.t("ui.reward.skip")}</button></div>`;
  const container = scene.querySelector(".reward-cards");
  options.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = `card ${card.type}`;
    cardEl.innerHTML = `<h3>${localization.t(card.nameKey)}</h3><p>${localization.t(card.descriptionKey, card)}</p>`;
    cardEl.addEventListener("click", () => {
      runManager.state.player.discardPile.push(card.id);
      runManager.state.startDeck.push(card.id);
      showToast(localization.t("ui.reward.cardAdded"));
      runManager.save();
      goNextNode();
    });
    container.appendChild(cardEl);
  });
  document.getElementById("skip-reward").addEventListener("click", () => {
    runManager.save();
    goNextNode();
  });
  tutorialBox.textContent = localization.t("tutorial.result");
}

function renderShop() {
  currentScene = "shop";
  scene.innerHTML = `<div class="shop"><h2>${localization.t("ui.shop")}</h2><p>${localization.t("ui.reward.gold")}: ${runManager.state.gold}</p><div class="items"></div><div class="deck"></div><button id="leave-shop">${localization.t("ui.shop.leave")}</button></div>`;
  const itemsEl = scene.querySelector(".items");
  const cards = seededShuffle([...CARD_LIBRARY], mulberry32(Date.now())).slice(0, 3);
  cards.forEach((card) => {
    const price = 60;
    const button = document.createElement("button");
    button.textContent = `${localization.t(card.nameKey)} - ${price}`;
    button.addEventListener("click", () => {
      if (runManager.state.gold >= price) {
        runManager.state.gold -= price;
        runManager.state.player.discardPile.push(card.id);
        runManager.state.startDeck.push(card.id);
        audioManager.play("shop");
        loadMeta();
        runManager.save();
        renderShop();
      }
    });
    itemsEl.appendChild(button);
  });
  const removeBtn = document.createElement("button");
  const removeCost = 75;
  removeBtn.textContent = `${localization.t("ui.shop.remove")} - ${removeCost}`;
  removeBtn.addEventListener("click", () => {
    if (runManager.state.gold < removeCost) return;
    const removable = runManager.state.startDeck.filter((id) => id !== "nova" && id !== "star_draw");
    if (!removable.length) return;
    const target = removable[0];
    let removed = false;
    runManager.state.startDeck = runManager.state.startDeck.filter((id) => {
      if (!removed && id === target) {
        removed = true;
        return false;
      }
      return true;
    });
    if (removed) {
      const piles = [runManager.state.player.drawPile, runManager.state.player.discardPile, runManager.state.player.hand, runManager.state.player.exhaustPile];
      for (const pile of piles) {
        const idx = pile.indexOf(target);
        if (idx !== -1) {
          pile.splice(idx, 1);
          break;
        }
      }
    }
    runManager.state.gold -= removeCost;
    loadMeta();
    showToast(localization.t("ui.shop.remove"));
    runManager.save();
    renderShop();
  });
  itemsEl.appendChild(removeBtn);

  const potionBtn = document.createElement("button");
  const potionCost = 50;
  potionBtn.textContent = `${localization.t("ui.shop.potion")} - ${potionCost}`;
  potionBtn.addEventListener("click", () => {
    if (runManager.state.gold < potionCost) return;
    runManager.state.gold -= potionCost;
    runManager.state.potions.push({ id: "heal", value: 20 });
    loadMeta();
    showToast(localization.t("ui.shop.potion"));
    runManager.save();
    renderShop();
  });
  itemsEl.appendChild(potionBtn);

  const deckEl = scene.querySelector(".deck");
  deckEl.innerHTML = `<h3>${localization.t("ui.deck")}</h3><p>${runManager.state.startDeck.join(", ")}</p>`;
  document.getElementById("leave-shop").addEventListener("click", () => {
    goNextNode();
  });
  tutorialBox.textContent = localization.t("tutorial.shop");
}

function renderEvent() {
  currentScene = "event";
  scene.innerHTML = `<div class="event"><h2>${localization.t("ui.event")}</h2><button id="event-continue">${localization.t("ui.continue")}</button></div>`;
  document.getElementById("event-continue").addEventListener("click", () => {
    runManager.state.player.hp = Math.min(runManager.state.player.maxHp, runManager.state.player.hp + 10);
    runManager.save();
    goNextNode();
  });
}

function renderResult() {
  currentScene = "result";
  if (!lastResult) {
    scene.innerHTML = `<div class="result"><h2>${localization.t("ui.result")}</h2></div>`;
    return;
  }
  scene.innerHTML = `<div class="result"><h2>${localization.t(lastResult.victory ? "ui.result.win" : "ui.result.lose")}</h2><p>+${lastResult.reward} ${localization.t("ui.meta.stardust")}</p><p>${localization.t("ui.token")}: ${lastResult.token}</p><button id="share-run">${localization.t("ui.shareRun")}</button></div>`;
  document.getElementById("share-run").addEventListener("click", () => {
    navigator.clipboard.writeText(lastResult.url);
    showToast(localization.t("ui.copy"));
  });
}

function goNextNode() {
  runManager.state.nodeIndex += 1;
  loadMeta();
  runManager.save();
  if (runManager.state.nodeIndex >= runManager.state.map.length) {
    concludeRun(true);
  } else {
    currentScene = "map";
    renderMap();
  }
}

async function concludeRun(victory) {
  const result = await runManager.completeRun(victory);
  loadMeta();
  const shareUrl = `${location.origin}${location.pathname}#run=${result.token}&ghost=${result.ghost}`;
  lastResult = { victory, reward: result.reward, token: result.token, url: shareUrl };
  scene.innerHTML = `<div class="result"><h2>${localization.t(victory ? "ui.result.win" : "ui.result.lose")}</h2><p>+${result.reward} ${localization.t("ui.meta.stardust")}</p><p>${localization.t("ui.token")}: ${result.token}</p><button id="copy-share">${localization.t("ui.shareRun")}</button></div>`;
  document.getElementById("copy-share").addEventListener("click", () => {
    navigator.clipboard.writeText(shareUrl);
    showToast(localization.t("ui.copy"));
  });
  tutorialBox.textContent = localization.t("tutorial.result");
  currentScene = "result";
}

function prepareDaily() {
  const date = new Date();
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const iso = utcDate.toISOString().split("T")[0];
  hashStringToSeed(iso).then((seed) => {
    dailySeed = seed.toString();
    document.getElementById("daily-btn").textContent = `${localization.t("ui.daily")} (${localization.t("ui.daily.modifier.hand")})`;
  });
}

function checkHash() {
  const hash = location.hash;
  if (hash.includes("run=")) {
    const token = hash.split("run=")[1].split("&")[0];
    const data = decodeRun(token);
    if (data) {
      runManager.newRun(data.seed, data.modifier).then(() => {
        runManager.state.startDeck = data.deck;
        currentScene = "map";
        renderMap();
      });
    }
  }
  if (hash.includes("ghost=")) {
    const token = hash.split("ghost=")[1].split("&")[0];
    ghostReplay = decodeGhost(token);
    ghostIndex = 0;
    ghostReady = ghostReplay.length > 0;
    if (ghostReady) {
      showToast(localization.t("ui.ghostLoaded"));
    }
  }
}

function updateSettingsUI() {
  document.getElementById("volume-range").value = settings.volume;
  document.getElementById("font-range").value = settings.fontSize;
  document.documentElement.style.setProperty("--font-size", `${settings.fontSize}px`);
}

setup();

window.addEventListener("resize", () => {
  if (window.innerWidth < 720) {
    document.body.classList.add("letterbox");
  } else {
    document.body.classList.remove("letterbox");
  }
});

window.addEventListener("keydown", (event) => {
  if (currentScene === "battle") {
    const index = Number(event.key) - 1;
    if (index >= 0) {
      const cardId = runManager.state.player.hand[index];
      if (cardId) {
        runManager.battle.playCard(cardId, runManager.battle.enemy);
        runManager.save();
        renderBattle();
      }
    }
    if (event.code === "Space") {
      runManager.battle.enemyTurn();
      runManager.battle.nextTurn();
      runManager.save();
      renderBattle();
    }
  }
});

const STEP = 1000 / 60;
let lastTime = performance.now();

function loop(time) {
  const delta = time - lastTime;
  if (delta >= STEP) {
    lastTime = time - (delta % STEP);
  }
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

function prepareGhost(enemyId) {
  if (!ghostReady) return;
  while (ghostIndex < ghostReplay.length) {
    const entry = ghostReplay[ghostIndex];
    if (entry.action?.startsWith("battle_start") && entry.action.endsWith(enemyId)) {
      ghostIndex += 1;
      return;
    }
    ghostIndex += 1;
  }
  ghostReady = false;
}

function playGhostAction() {
  if (!ghostReady) return;
  while (ghostIndex < ghostReplay.length) {
    const entry = ghostReplay[ghostIndex++];
    if (entry.action?.startsWith("card:")) {
      const cardId = entry.action.split(":")[1];
      if (runManager.state.player.hand.includes(cardId)) {
        runManager.battle.playCard(cardId, runManager.battle.enemy);
        setTimeout(() => renderBattle(), 200);
        return;
      }
    }
    if (entry.action?.startsWith("enemy_intent")) {
      runManager.battle.enemyTurn();
      runManager.battle.nextTurn();
      setTimeout(() => renderBattle(), 200);
      return;
    }
  }
  ghostReady = false;
}

