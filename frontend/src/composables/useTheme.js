import { ref } from 'vue'

const THEME_KEY = 'pixelmimic-theme'

function getInitialTheme() {
  const attr = document.documentElement.dataset.theme
  return attr === 'light' ? 'light' : 'dark'
}

// 模块级单例：所有组件共享同一主题状态
const theme = ref(getInitialTheme())

export function useTheme() {
  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  const setTheme = (next) => {
    theme.value = next
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch (e) {
      /* 存储不可用时主题仅在当前会话生效 */
    }
  }

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}
