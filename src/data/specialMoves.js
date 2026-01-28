// Special moves with unique type effectiveness
export const SPECIAL_MOVES = {
  'Flying Press': {
    name: 'Flying Press',
    types: ['fighting', 'flying'],
    description: 'Dual Fighting/Flying effectiveness'
  },
  'Freeze-Dry': {
    name: 'Freeze-Dry',
    types: ['ice'],
    superEffective: ['water'],
    description: 'Always super-effective vs Water'
  }
}

export const SPECIAL_MOVE_NAMES = Object.keys(SPECIAL_MOVES)
