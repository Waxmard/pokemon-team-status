import { toRaw } from 'vue'

export function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue)
    }

    Object.freeze(value)
  }

  return value
}

// JSON round-trip required here — structuredClone fails on Vue reactive internals
export function cloneValue(value) {
  return deepFreeze(JSON.parse(JSON.stringify(toRaw(value))))
}
