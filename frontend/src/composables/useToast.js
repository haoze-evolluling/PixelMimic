import { ref } from 'vue'

const toasts = ref([])

export function useToast() {
  const showToast = (message, type = 'info', duration = 3200) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
    const toast = { id, message, type }
    toasts.value.push(toast)

    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  const removeToast = (id) => {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      toasts.value.splice(idx, 1)
    }
  }

  return {
    toasts,
    showToast,
    removeToast,
  }
}
