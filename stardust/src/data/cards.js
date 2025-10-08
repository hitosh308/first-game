export default [
  {
    "id": "strike",
    "nameKey": "card.strike.name",
    "descriptionKey": "card.strike.desc",
    "type": "attack",
    "cost": 1,
    "damage": 6,
    "block": 0,
    "upgrade": {"damage": 9}
  },
  {
    "id": "defend",
    "nameKey": "card.defend.name",
    "descriptionKey": "card.defend.desc",
    "type": "skill",
    "cost": 1,
    "damage": 0,
    "block": 5,
    "upgrade": {"block": 8}
  },
  {
    "id": "nova",
    "nameKey": "card.nova.name",
    "descriptionKey": "card.nova.desc",
    "type": "power",
    "cost": 2,
    "damage": 0,
    "block": 0,
    "effect": "gainStrength",
    "value": 2,
    "upgrade": {"value": 3}
  },
  {
    "id": "meteor",
    "nameKey": "card.meteor.name",
    "descriptionKey": "card.meteor.desc",
    "type": "attack",
    "cost": 2,
    "damage": 15,
    "block": 0,
    "upgrade": {"damage": 20}
  },
  {
    "id": "shield_burst",
    "nameKey": "card.shield_burst.name",
    "descriptionKey": "card.shield_burst.desc",
    "type": "skill",
    "cost": 1,
    "damage": 0,
    "block": 8,
    "effect": "reflect",
    "value": 2,
    "upgrade": {"block": 11, "value": 3}
  },
  {
    "id": "star_draw",
    "nameKey": "card.star_draw.name",
    "descriptionKey": "card.star_draw.desc",
    "type": "skill",
    "cost": 0,
    "draw": 2,
    "upgrade": {"draw": 3}
  },
  {
    "id": "supernova",
    "nameKey": "card.supernova.name",
    "descriptionKey": "card.supernova.desc",
    "type": "attack",
    "cost": 3,
    "damage": 24,
    "effect": "applyBurn",
    "value": 2,
    "upgrade": {"damage": 30, "value": 3}
  },
  {
    "id": "warp",
    "nameKey": "card.warp.name",
    "descriptionKey": "card.warp.desc",
    "type": "skill",
    "cost": 1,
    "effect": "phase",
    "value": 1,
    "upgrade": {"value": 2}
  },
  {
    "id": "nebula_armor",
    "nameKey": "card.nebula_armor.name",
    "descriptionKey": "card.nebula_armor.desc",
    "type": "power",
    "cost": 2,
    "effect": "gainPlating",
    "value": 4,
    "upgrade": {"value": 6}
  },
  {
    "id": "gravity_well",
    "nameKey": "card.gravity_well.name",
    "descriptionKey": "card.gravity_well.desc",
    "type": "skill",
    "cost": 1,
    "effect": "weak",
    "value": 2,
    "damage": 0,
    "block": 0,
    "upgrade": {"value": 3}
  },
  {
    "id": "chronoshift",
    "nameKey": "card.chronoshift.name",
    "descriptionKey": "card.chronoshift.desc",
    "type": "skill",
    "cost": 1,
    "effect": "extraEnergy",
    "value": 1,
    "upgrade": {"value": 2}
  },
  {
    "id": "star_barrage",
    "nameKey": "card.star_barrage.name",
    "descriptionKey": "card.star_barrage.desc",
    "type": "attack",
    "cost": 1,
    "damage": 4,
    "hits": 3,
    "upgrade": {"damage": 5, "hits": 3}
  },
  {
    "id": "eclipse",
    "nameKey": "card.eclipse.name",
    "descriptionKey": "card.eclipse.desc",
    "type": "power",
    "cost": 1,
    "effect": "lifesteal",
    "value": 2,
    "upgrade": {"value": 3}
  }
]

