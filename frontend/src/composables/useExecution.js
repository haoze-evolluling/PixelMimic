import { ref, reactive } from 'vue'
import { usePyWebView } from './usePyWebView'
import { useToast } from './useToast'

const executionState = ref('idle')
const activeStepIndex = ref(-1)
const cursorPos = reactive({ x: 0, y: 0 })
const loopProgress = reactive({ current: 1, total: 1 })
const stepStatuses = reactive({})
const logs = ref([])
const autoScroll = ref(true)

export function useExecution() {
  const { getApi, registerEventListener } = usePyWebView()
  const { showToast } = useToast()

  const appendLog = (level, message, timeStr) => {
    const time = timeStr || new Date().toLocaleTimeString('zh-CN', { hour12: false })
    logs.value.push({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      level,
      message,
      time,
    })
    // Cap the log buffer so long-running infinite loops don't grow it unbounded
    if (logs.value.length > 500) {
      logs.value.splice(0, logs.value.length - 500)
    }
  }

  const clearLogs = () => {
    logs.value = []
  }

  const setExecutionState = (state) => {
    executionState.value = state
    if (state === 'idle' || state === 'stopped' || state === 'completed' || state === 'error') {
      activeStepIndex.value = -1
    }
  }

  const setCursorPos = (x, y) => {
    cursorPos.x = x
    cursorPos.y = y
  }

  const setLoopProgress = (current, total) => {
    loopProgress.current = current
    loopProgress.total = total
  }

  const resetStepStatuses = () => {
    Object.keys(stepStatuses).forEach(k => delete stepStatuses[k])
    activeStepIndex.value = -1
  }

  const setStepStatus = (index, status) => {
    stepStatuses[index] = status
  }

  // Setup backend event subscriptions
  const initEventListeners = () => {
    registerEventListener('step_started', (data) => {
      activeStepIndex.value = data.index
      setStepStatus(data.index, { state: 'running' })
      const el = document.getElementById(`step-card-${data.index}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    })

    registerEventListener('step_finished', (data) => {
      setStepStatus(data.index, {
        state: data.success ? 'success' : 'error',
        message: data.message,
      })
    })

    registerEventListener('state_changed', (data) => {
      setExecutionState(data.state)
    })

    registerEventListener('log_emitted', (data) => {
      appendLog(data.level, data.message, data.time)
    })

    registerEventListener('loop_progress', (data) => {
      setLoopProgress(data.current, data.total)
    })

    registerEventListener('execution_finished', (data) => {
      activeStepIndex.value = -1
      if (data.success) {
        showToast('工作流执行完成！', 'success')
      } else {
        showToast(`执行终止: ${data.message || '失败'}`, 'warning')
      }
    })
  }

  const startWorkflow = async (workflow, settings) => {
    const api = getApi()
    if (!api) return
    if (!workflow.steps || workflow.steps.length === 0) {
      showToast('工作流中没有步骤，请先添加操作步骤！', 'warning')
      return
    }
    resetStepStatuses()
    try {
      const res = await api.start_workflow(workflow, settings)
      if (!res.success) {
        showToast(res.message || '启动失败', 'error')
      }
    } catch (e) {
      showToast('启动异常: ' + e, 'error')
    }
  }

  const togglePause = async () => {
    const api = getApi()
    if (!api) return
    try {
      await api.toggle_pause()
    } catch (e) {
      console.error(e)
    }
  }

  const stopWorkflow = async () => {
    const api = getApi()
    if (!api) return
    try {
      await api.stop_workflow()
      showToast('工作流已强制停止', 'warning')
    } catch (e) {
      console.error(e)
    }
  }

  return {
    executionState,
    activeStepIndex,
    cursorPos,
    loopProgress,
    stepStatuses,
    logs,
    autoScroll,
    clearLogs,
    setExecutionState,
    setCursorPos,
    resetStepStatuses,
    initEventListeners,
    startWorkflow,
    togglePause,
    stopWorkflow,
  }
}
