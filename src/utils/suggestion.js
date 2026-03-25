export function getSuggestionIndicator(improvement) {
  if (improvement > 0) return { symbol: '\u25B2', cls: 'improvement-up' }
  if (improvement < 0) return { symbol: '\u25BC', cls: 'improvement-down' }
  return { symbol: '\u2014', cls: 'improvement-neutral' }
}
