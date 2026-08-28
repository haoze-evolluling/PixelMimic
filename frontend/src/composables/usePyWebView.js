import { ref } from 'vue'

const isApiReady = ref(false)
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
        isApiReady.value = true
        resolve(window.pywebview.api)
        return
      }

      const onReady = () => {
        isApiReady.value = true
        window.removeEventListener('pywebviewready', onReady)
        resolve(window.pywebview?.api || null)
      }

      window.addEventListener('pywebviewready', onReady)

      // Fallback timeout polling
      setTimeout(() => {
        if (window.pywebview && window.pywebview.api) {
          isApiReady.value = true
          resolve(window.pywebview.api)
        } else {
          // Dev mode fallback
          resolve(null)
        }
      }, 500)
    })
  }

  return {
    isApiReady,
    getApi,
    initPyWebView,
    registerEventListener,
  }
}
