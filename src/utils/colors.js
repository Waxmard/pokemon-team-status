import { TYPE_COLORS } from '../data/types.js'

export function hexToRgba(hex, alpha) {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getTypeBackground(type, opacity = 0.15) {
  const color = TYPE_COLORS[type].bg
  return {
    background: `linear-gradient(135deg, ${hexToRgba(color, opacity)} 0%, ${hexToRgba(color, opacity * 0.7)} 100%)`
  }
}
