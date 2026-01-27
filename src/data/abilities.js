// Type-affecting abilities
export const ABILITIES = {
  "Water Absorb": { immunity: ["water"] },
  "Storm Drain": { immunity: ["water"] },
  "Volt Absorb": { immunity: ["electric"] },
  "Lightning Rod": { immunity: ["electric"] },
  "Levitate": { immunity: ["ground"] },
  "Flash Fire": { immunity: ["fire"] },
  "Sap Sipper": { immunity: ["grass"] },
  "Thick Fat": { resistance: ["fire", "ice"] },
  "Dry Skin": { immunity: ["water"], weakness: ["fire"] },
  "Motor Drive": { immunity: ["electric"] },
  "Heatproof": { resistance: ["fire"] },
  "Protean": { protean: true },
  "Libero": { protean: true }
}

export const ABILITY_NAMES = Object.keys(ABILITIES)
