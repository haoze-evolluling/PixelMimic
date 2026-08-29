<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { usePyWebView } from './composables/usePyWebView'
import { useWorkflow } from './composables/useWorkflow'
import { useExecution } from './composables/useExecution'
import { useSettings } from './composables/useSettings'

import HeaderBar from './components/HeaderBar.vue'
import ActionPalette from './components/ActionPalette.vue'
import WorkflowCanvas from './components/WorkflowCanvas.vue'
import Inspector from './components/Inspector.vue'
import ConsoleLogs from './components/ConsoleLogs.vue'
import StatusBar from './components/StatusBar.vue'
import SettingsModal from './components/SettingsModal.vue'
import AboutModal from './components/AboutModal.vue'
import ToastContainer from './components/ToastContainer.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'

const { initPyWebView } = usePyWebView()
const {
  workflow,
  filePath,
  selectStep,
  newWorkflow,
  openWorkflow,
  saveWorkflow,
  startSnipForCurrentStep,
  initWorkflowListeners,
} = useWorkflow()
const {
  setExecutionState,
  setCursorPos,
  initEventListeners,
  startWorkflow,
  togglePause,
  stopWorkflow,
} = useExecution()
const { settings, setSettings } = useSettings()

const isSettingsOpen = ref(false)
const isAboutOpen = ref(false)

const handleKeyDown = (e) => {
  // Skip shortcuts while typing in form fields (same guard as WorkflowCanvas)
  const tag = e.target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return
  }
  if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault()
    saveWorkflow()
  } else if (e.ctrlKey && (e.key === 'o' || e.key === 'O')) {
    e.preventDefault()
    openWorkflow()
  } else if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault()
    newWorkflow()
  } else if (e.key === 'F8') {
    e.preventDefault()
    startWorkflow(workflow, settings.value)
  } else if (e.key === 'F9') {
    e.preventDefault()
    togglePause()
  } else if (e.key === 'F10') {
    e.preventDefault()
    stopWorkflow()
  } else if (e.key === 'F7') {
    e.preventDefault()
    startSnipForCurrentStep()
  }
}

// Coalesce mousemove into one cursorPos write per frame
let moveRafId = 0
let lastMouseX = 0
let lastMouseY = 0
const handleMouseMove = (e) => {
  lastMouseX = e.screenX
  lastMouseY = e.screenY
  if (moveRafId) return
  moveRafId = requestAnimationFrame(() => {
    moveRafId = 0
    setCursorPos(lastMouseX, lastMouseY)
  })
}

onMounted(async () => {
  initEventListeners()
  initWorkflowListeners()

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mousemove', handleMouseMove)

  const api = await initPyWebView()
  if (api) {
    try {
      const data = await api.get_initial_data()
      if (data) {
        if (data.workflow) Object.assign(workflow, data.workflow)
        if (data.filePath) filePath.value = data.filePath
        if (data.settings) setSettings(data.settings)
        if (data.cursorPos) setCursorPos(data.cursorPos.x, data.cursorPos.y)
        if (data.state) setExecutionState(data.state)

        if (workflow.steps && workflow.steps.length > 0) {
          selectStep(0)
        }
      }
    } catch (e) {
      console.error('Failed to load initial backend data:', e)
    }
  }
})

onUnmounted(() => {
  if (moveRafId) cancelAnimationFrame(moveRafId)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('mousemove', handleMouseMove)
})
</script>

<template>
  <div class="app-layout">
    <!-- Header -->
    <HeaderBar
      @open-settings="isSettingsOpen = true"
      @open-about="isAboutOpen = true"
    />

    <!-- Quick Action Palette -->
    <ActionPalette />

    <!-- Main Workspace -->
    <main class="main-workspace">
      <WorkflowCanvas />
      <Inspector />
    </main>

    <!-- Bottom Console -->
    <ConsoleLogs />

    <!-- Status Bar -->
    <StatusBar />

    <!-- Modals -->
    <SettingsModal
      :is-open="isSettingsOpen"
      @close="isSettingsOpen = false"
    />
    <AboutModal
      :is-open="isAboutOpen"
      @close="isAboutOpen = false"
    />

    <!-- Toast Notifications -->
    <ToastContainer />

    <!-- Global Confirm Dialog -->
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.app-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-app);
}

.main-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}
</style>
