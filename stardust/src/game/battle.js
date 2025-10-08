import { getCardDefinition, createEnemy } from "./state.js";
import { seededShuffle } from "../engine/random.js";
import { ObjectPool } from "../engine/pool.js";

const floatPool = new ObjectPool(() => {
  const div = document.createElement("div");
  div.className = "damage-float";
  return div;
});

export class Battle {
  constructor(state, rng, audio, localization, settings) {
    this.state = state;
    this.rng = rng;
    this.audio = audio;
    this.localization = localization;
    this.settings = settings;
    this.turn = 0;
    this.enemy = null;
    this.particles = [];
  }

  start(type = "battle") {
    this.enemy = createEnemy(type === "elite" ? "elite" : "normal", this.rng);
    this.state.player.block = 0;
    this.state.player.energyPerTurn = 3 + (this.state.relics.includes("glass_chronometer") ? 1 : 0);
    this.state.player.energy = this.state.player.energyPerTurn;
    this.state.player.strength = 0;
    const combinedDeck = [...this.state.player.drawPile, ...this.state.player.discardPile];
    this.state.player.hand = [];
    this.state.player.discardPile = [];
    this.state.player.exhaustPile = [];
    this.state.player.powers = {};
    this.state.player.statuses = {};
    this.state.player.drawPile = seededShuffle(combinedDeck, this.rng);
    this.turn = 0;
    this.drawCards(5 + (this.state.modifierHand || 0));
    if (this.state.relics.includes("meteor_core")) {
      this.state.player.strength += 1;
    }
    this.log(`battle_start:${this.enemy.id}`);
  }

  nextTurn() {
    this.turn += 1;
    this.state.player.energy = this.state.player.energyPerTurn;
    this.state.player.block = this.state.player.powers.plating || 0;
    if (this.state.player.powers.extraEnergy) {
      this.state.player.energy += this.state.player.powers.extraEnergy;
      this.state.player.powers.extraEnergy = 0;
    }
    if (this.state.player.statuses.weak) {
      this.state.player.statuses.weak = Math.max(0, this.state.player.statuses.weak - 1);
    }
    this.drawCards(5);
    this.updateEnemyIntent();
  }

  drawCards(count) {
    for (let i = 0; i < count; i++) {
      if (!this.state.player.drawPile.length) {
        this.state.player.drawPile = seededShuffle(this.state.player.discardPile, this.rng);
        this.state.player.discardPile = [];
      }
      const card = this.state.player.drawPile.shift();
      if (!card) return;
      this.state.player.hand.push(card);
    }
  }

  playCard(cardId, target) {
    const handIndex = this.state.player.hand.indexOf(cardId);
    if (handIndex === -1) return false;
    const card = getCardDefinition(cardId);
    if (!card) return false;
    const cost = card.cost || 0;
    if (card.type === "power" && this.state.relics.includes("warp_singularity") && !this.state.player.powers.firstPowerFree) {
      this.state.player.powers.firstPowerFree = true;
    } else if (this.state.player.energy < cost) {
      return false;
    } else {
      this.state.player.energy -= cost;
    }
    this.state.player.hand.splice(handIndex, 1);
    this.resolveCard(card, target);
    this.state.player.discardPile.push(cardId);
    this.log(`card:${cardId}`);
    this.audio.play("attack");
    return true;
  }

  resolveCard(card, target) {
    const damage = (card.damage || 0) + this.state.player.strength;
    const block = card.block || 0;
    if (damage) {
      const hits = card.hits || 1;
      for (let i = 0; i < hits; i++) {
        this.dealDamage(target, damage);
      }
    }
    if (block) {
      this.state.player.block += block;
    }
    if (card.draw) {
      this.drawCards(card.draw);
    }
    if (card.effect) {
      switch (card.effect) {
        case "gainStrength":
          this.state.player.strength += card.value || 1;
          break;
        case "reflect":
          this.state.player.powers.reflect = (this.state.player.powers.reflect || 0) + (card.value || 1);
          break;
        case "applyBurn":
          this.enemy.statuses.burn = (this.enemy.statuses.burn || 0) + (card.value || 1);
          break;
        case "phase":
          this.state.player.statuses.phase = (this.state.player.statuses.phase || 0) + (card.value || 1);
          break;
        case "gainPlating":
          this.state.player.powers.plating = (this.state.player.powers.plating || 0) + (card.value || 1);
          break;
        case "weak":
          this.enemy.statuses.weak = (this.enemy.statuses.weak || 0) + (card.value || 1);
          break;
        case "extraEnergy":
          this.state.player.powers.extraEnergy = (this.state.player.powers.extraEnergy || 0) + (card.value || 1);
          break;
        case "lifesteal":
          this.state.player.powers.lifesteal = (this.state.player.powers.lifesteal || 0) + (card.value || 0);
          break;
      }
    }
  }

  dealDamage(target, amount) {
    const actual = Math.max(0, amount - target.block);
    target.block = Math.max(0, target.block - amount);
    target.hp -= actual;
    if (target === this.enemy) {
      this.spawnFloat(`-${actual}`);
      if (this.state.player.powers.lifesteal) {
        const heal = Math.round(actual * (this.state.player.powers.lifesteal / 100));
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + heal);
      }
    }
    if (target.hp <= 0) {
      this.audio.play("hit");
    }
  }

  enemyTurn() {
    if (!this.enemy) return;
    if (this.enemy.statuses.burn) {
      this.dealDamage(this.enemy, this.enemy.statuses.burn);
      this.enemy.statuses.burn = Math.max(0, this.enemy.statuses.burn - 1);
      if (this.enemy.hp <= 0) {
        return;
      }
    }
    const intent = this.getIntent();
    switch (intent.type) {
      case "attack":
        const hits = intent.hits || 1;
        for (let i = 0; i < hits; i++) {
          this.enemyAttack(intent.value);
        }
        break;
      case "block":
        this.enemy.block += intent.value;
        break;
      case "buff":
        this.enemy.statuses[intent.status] = (this.enemy.statuses[intent.status] || 0) + intent.value;
        break;
      case "debuff":
        this.state.player.statuses[intent.status] = (this.state.player.statuses[intent.status] || 0) + intent.value;
        break;
      case "heal":
        this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + intent.value);
        break;
    }
    this.enemy.intentIndex = (this.enemy.intentIndex + 1) % this.enemy.intents.length;
    this.log(`enemy_intent:${intent.type}`);
  }

  getIntent() {
    return this.enemy.intents[this.enemy.intentIndex];
  }

  updateEnemyIntent() {
    const intent = this.getIntent();
    if (intent.condition === "playerBlockLow" && this.state.player.block < 5) {
      return intent;
    }
    if (intent.condition === "hpBelowHalf" && this.enemy.hp < this.enemy.maxHp / 2) {
      return intent;
    }
    return intent;
  }

  enemyAttack(value) {
    let damage = value + (this.enemy.statuses.strength || 0);
    if (this.enemy.statuses.weak) {
      damage = Math.floor(damage * 0.75);
      this.enemy.statuses.weak = Math.max(0, this.enemy.statuses.weak - 1);
    }
    if (this.state.player.statuses.weak) {
      damage = Math.ceil(damage * 1.25);
    }
    const phase = this.state.player.statuses.phase || 0;
    if (phase > 0) {
      this.state.player.statuses.phase = Math.max(0, phase - 1);
      return;
    }
    const blockDamage = Math.min(this.state.player.block, damage);
    this.state.player.block = Math.max(0, this.state.player.block - damage);
    const hpDamage = damage - blockDamage;
    this.state.player.hp -= hpDamage;
    if (this.state.player.powers.reflect && hpDamage > 0) {
      this.dealDamage(this.enemy, this.state.player.powers.reflect);
    }
    this.spawnFloat(`-${hpDamage}`);
    this.audio.play("hit");
  }

  spawnFloat(text) {
    const float = floatPool.acquire();
    float.textContent = text;
    float.classList.add("show");
    document.body.appendChild(float);
    setTimeout(() => {
      float.classList.remove("show");
      if (float.parentElement) float.parentElement.removeChild(float);
      floatPool.release(float);
    }, this.settings.reducedMotion ? 200 : 600);
  }

  log(action) {
    this.state.ghostLog.push({ t: Date.now(), action });
  }
}
