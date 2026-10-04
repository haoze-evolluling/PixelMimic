import { usePyWebView } from '../usePyWebView'
import { useToast } from '../useToast'
import { useWorkflowStore } from './workflowStore'

/**
 * useStepTools.js
 * 面向当前选中步骤的联调工具：截屏取样、匹配测试、坐标拾取与单步测试。
 */
export function useStepTools() {
  const { getApi, registerEventListener } = usePyWebView()
  const { showToast } = useToast()
  const { workflow, selectedStep, syncWorkflow } = useWorkflowStore()

  const startSnipForCurrentStep = async () => {
    const api = getApi()
    if (!api) return
    try {
      showToast('全屏截屏已启动：鼠标框选目标，按 Enter 确认，Esc 取消', 'info')
      await api.start_snip()
    } catch (e) {
      showToast('截屏调起失败: ' + e, 'error')
    }
  }

  const testMatchForCurrentStep = async () => {
    const api = getApi()
    if (!api || !selectedStep.value) return
    try {
      const res = await api.test_match(selectedStep.value)
      if (res.found) {
        showToast(res.message, 'success')
      } else {
        showToast(res.message, 'warning')
      }
    } catch (e) {
      showToast('匹配测试发生异常: ' + e, 'error')
    }
  }

  const pickMousePosForCurrentStep = async () => {
    const api = getApi()
    if (!api || !selectedStep.value) return
    try {
      const res = await api.pick_mouse_position()
      if (res && res.success) {
        selectedStep.value.x = res.x
        selectedStep.value.y = res.y
        showToast(`已拾取当前鼠标坐标: (${res.x}, ${res.y})`, 'success')
        syncWorkflow()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const pickDragEndPos = async () => {
    const api = getApi()
    if (!api || !selectedStep.value) return
    try {
      const res = await api.pick_mouse_position()
      if (res && res.success) {
        selectedStep.value.drag_to_x = res.x
        selectedStep.value.drag_to_y = res.y
        showToast(`已拾取终点坐标: (${res.x}, ${res.y})`, 'success')
        syncWorkflow()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const testSingleStep = async (index) => {
    const api = getApi()
    if (!api || index < 0 || index >= workflow.steps.length) return
    const step = workflow.steps[index]
    try {
      showToast(`开始测试单步: [${step.name}]`, 'info')
      const res = await api.test_single_step(step, index)
      if (res.success) {
        showToast(`单步测试成功: ${res.message || '完成'} (${res.executionTime}s)`, 'success')
      } else {
        showToast(`单步测试失败: ${res.message || '未成功'}`, 'error')
      }
    } catch (e) {
      showToast('测试执行异常: ' + e, 'error')
    }
  }

  // Register backend snip callback
  const initWorkflowListeners = () => {
    registerEventListener('snip_captured', (data) => {
      if (selectedStep.value) {
        selectedStep.value.image_base64 = data.image_base64
        selectedStep.value.x = data.x
        selectedStep.value.y = data.y
        showToast(`截图已应用: (${data.x}, ${data.y}) 尺寸: ${data.width}x${data.height}`, 'success')
        syncWorkflow()
      }
    })
  }

  return {
    startSnipForCurrentStep,
    testMatchForCurrentStep,
    pickMousePosForCurrentStep,
    pickDragEndPos,
    testSingleStep,
    initWorkflowListeners,
  }
}
