import { ref } from 'vue'
import { usePyWebView } from './usePyWebView'

const settings = ref({
  loop_count: 1,
  loop_interval: 1.0,
  minimize_on_run: true,
  failsafe: true,
})

export function useSettings() {
  const { getApi } = usePyWebView()

  const setSettings = (newSettings) => {
    Object.assign(settings.value, newSettings)
  }

  const saveSettings = async () => {
    const api = getApi()
    if (api) {
      try {
        await api.save_settings(settings.value)
      } catch (e) {
        console.error('Failed to save settings:', e)
      }
    }
  }

  return {
    settings,
    setSettings,
    saveSettings,
  }
}
