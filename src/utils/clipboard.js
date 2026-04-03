function fallbackCopy(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

export function copyToClipboard(text, labelRef, resetMs = 2000) {
  if (!text) return

  function onSuccess() {
    labelRef.value = 'copied!'
    setTimeout(() => {
      labelRef.value = 'tap to copy'
    }, resetMs)
  }

  function tryFallback() {
    if (fallbackCopy(text)) {
      onSuccess()
    } else {
      labelRef.value = 'copy failed'
    }
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(tryFallback)
  } else {
    tryFallback()
  }
}
