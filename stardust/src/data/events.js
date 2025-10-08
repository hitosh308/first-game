export default [
  {
    "id": "starlit_fountain",
    "nameKey": "event.starlit_fountain.name",
    "options": [
      {"id": "heal", "type": "heal", "value": 20, "textKey": "event.starlit_fountain.option.heal"},
      {"id": "transform", "type": "transform", "value": 1, "textKey": "event.starlit_fountain.option.transform"}
    ]
  },
  {
    "id": "void_dealer",
    "nameKey": "event.void_dealer.name",
    "options": [
      {"id": "relic", "type": "gainRelic", "value": "random", "cost": 40, "textKey": "event.void_dealer.option.relic"},
      {"id": "curse", "type": "addCard", "cardId": "meteor", "textKey": "event.void_dealer.option.curse"}
    ]
  }
]

