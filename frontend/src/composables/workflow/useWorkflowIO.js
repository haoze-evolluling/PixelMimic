import { usePyWebView } from '../usePyWebView'
import { useToast } from '../useToast'
import { useExecution } from '../useExecution'
import { useWorkflowStore } from './workflowStore'

/**
 * useWorkflowIO.js
 * 工作流文件生命周期：新建 / 打开 / 保存 / 载入新手示例模板。
 */
export function useWorkflowIO() {
  const { getApi } = usePyWebView()
  const { showToast } = useToast()
  const { resetStepStatuses } = useExecution()
  const { workflow, filePath, selectedStepIndex } = useWorkflowStore()

  const newWorkflow = async () => {
    const api = getApi()
    if (!api) return
    try {
      const res = await api.new_workflow()
      if (res && res.success) {
        Object.assign(workflow, res.workflow)
        filePath.value = null
        selectedStepIndex.value = -1
        resetStepStatuses()
        showToast('已创建新工作流', 'info')
      }
    } catch (e) {
      showToast('创建失败: ' + e, 'error')
    }
  }

  const openWorkflow = async () => {
    const api = getApi()
    if (!api) return
    try {
      const res = await api.open_workflow()
      if (res && res.success) {
        Object.assign(workflow, res.workflow)
        filePath.value = res.filePath
        selectedStepIndex.value = workflow.steps.length > 0 ? 0 : -1
        resetStepStatuses()
        showToast(`成功打开工作流: ${res.fileName}`, 'success')
      } else if (res && res.message) {
        showToast(res.message, 'error')
      }
    } catch (e) {
      showToast('打开文件异常: ' + e, 'error')
    }
  }

  const saveWorkflow = async () => {
    const api = getApi()
    if (!api) return
    try {
      const res = await api.save_workflow(workflow, filePath.value)
      if (res && res.success) {
        filePath.value = res.filePath
        showToast(`成功保存至: ${res.fileName}`, 'success')
      } else if (res && res.message) {
        showToast(res.message, 'error')
      }
    } catch (e) {
      showToast('保存文件异常: ' + e, 'error')
    }
  }

  const loadSampleTemplate = async () => {
    const api = getApi()
    if (!api) return
    try {
      const res = await api.load_sample_template('basic')
      if (res && res.success) {
        Object.assign(workflow, res.workflow)
        filePath.value = null
        selectedStepIndex.value = 0
        resetStepStatuses()
        showToast('已载入新手示例工作流，点击【启动运行】即可体验！', 'success')
      }
    } catch (e) {
      showToast('载入示例失败: ' + e, 'error')
    }
  }

  return {
    newWorkflow,
    openWorkflow,
    saveWorkflow,
    loadSampleTemplate,
  }
}
