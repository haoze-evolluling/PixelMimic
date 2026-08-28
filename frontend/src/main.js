import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles/variables.css'
import './assets/styles/main.css'

// 开发调试入口：?mock=1 时在纯浏览器中注入示例流程（无需 pywebview 后端）
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('mock')) {
  import('./devMock').then(({ injectMockWorkflow }) => injectMockWorkflow())
}

createApp(App).mount('#app')
