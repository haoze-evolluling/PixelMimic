const eventListeners = new Map()

export function usePyWebView() {
  const getApi = () => {
    if (window.pywebview && window.pywebview.api) {
      return window.pywebview.api
    }
    return null
  }

  const onBackendEvent = (eventName, data) => {
    const listeners = eventListeners.get(eventName)
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb(data)
        } catch (e) {
          console.error(`Error in event listener for ${eventName}:`, e)
        }
      })
    }
  }

  const registerEventListener = (eventName, callback) => {
    if (!eventListeners.has(eventName)) {
      eventListeners.set(eventName, new Set())
    }
    eventListeners.get(eventName).add(callback)

    return () => {
      const set = eventListeners.get(eventName)
      if (set) {
        set.delete(callback)
      }
    }
  }

  const initPyWebView = () => {
    return new Promise((resolve) => {
      // Expose event handler globally for Python PyWebView evaluate_js
      window.PixelMimic = {
        onBackendEvent,
      }

      if (window.pywebview && window.pywebview.api) {
        resolve(window.pywebview.api)
        return
      }

      // Whichever of the two paths fires first wins; the other cleans up after itself
      let settled = false
      const resolveOnce = (api) => {
        if (settled) return
        settled = true
        window.removeEventListener('pywebviewready', onReady)
        clearTimeout(fallbackTimer)
        resolve(api)
      }
      const onReady = () => resolveOnce(window.pywebview?.api || null)
      window.addEventListener('pywebviewready', onReady)

      const fallbackTimer = setTimeout(() => {
        resolveOnce(window.pywebview?.api || null)
      }, 500)
    })
  }

  return {
    getApi,
    initPyWebView,
    registerEventListener,
  }
}
