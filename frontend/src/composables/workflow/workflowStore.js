import { ref, computed, reactive } from 'vue'
import { usePyWebView } from '../usePyWebView'

/**
 * workflowStore.js
 * 工作流核心状态的模块级单例 Store。
 * （workflow 导出仅供 devMock 在纯浏览器调试时注入数据）
 */
export const workflow = reactive({
  id: 'wf-1',
  name: '新工作流',
  description: '',
  loop_count: 1,
  loop_interval: 1.0,
  stop_on_error: true,
  steps: [],
})

const filePath = ref(null)
const selectedStepIndex = ref(-1)

export function useWorkflowStore() {
  const { getApi } = usePyWebView()

  const selectedStep = computed(() => {
    if (selectedStepIndex.value >= 0 && selectedStepIndex.value < workflow.steps.length) {
      return workflow.steps[selectedStepIndex.value]
    }
    return null
  })

  const fileName = computed(() => {
    if (filePath.value) {
      return filePath.value.split(/[\\/]/).pop()
    }
    return '未保存'
  })

  const selectStep = (index) => {
    if (index >= 0 && index < workflow.steps.length) {
      selectedStepIndex.value = index
    } else {
      selectedStepIndex.value = -1
    }
  }

  // Debounced sync: typing and node dragging call this every keystroke/frame,
  // and each call ships the whole workflow (incl. base64 images) over IPC.
  let syncTimer = null
  const syncWorkflow = () => {
    const api = getApi()
    if (!api) return
    if (syncTimer !== null) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      syncTimer = null
      api.update_workflow(workflow).catch((e) => {
        console.error('Sync workflow error:', e)
      })
    }, 300)
  }

  return {
    workflow,
    filePath,
    fileName,
    selectedStepIndex,
    selectedStep,
    selectStep,
    syncWorkflow,
  }
}
