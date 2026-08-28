import { ref, computed, reactive } from 'vue'
import { usePyWebView } from './usePyWebView'
import { useToast } from './useToast'
import { useExecution } from './useExecution'

const workflow = reactive({
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
const viewMode = ref('canvas') // 'canvas' | 'list'
const edgeStyle = ref('orthogonal') // 'orthogonal' | 'bezier'

export function useWorkflow() {
  const { getApi, registerEventListener } = usePyWebView()
  const { showToast } = useToast()
  const { resetStepStatuses } = useExecution()

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

  const syncWorkflow = async () => {
    const api = getApi()
    if (!api) return
    try {
      await api.update_workflow(workflow)
    } catch (e) {
      console.error('Sync workflow error:', e)
    }
  }

  const selectStep = (index) => {
    if (index >= 0 && index < workflow.steps.length) {
      selectedStepIndex.value = index
    } else {
      selectedStepIndex.value = -1
    }
  }

  const calculateSmartNodePosition = (actionType) => {
    if (!workflow.steps || workflow.steps.length === 0) {
      return { x: 100, y: 160 }
    }
    const lastStep = workflow.steps[workflow.steps.length - 1]
    const lastX = (lastStep.node_x !== undefined && lastStep.node_x !== null) ? lastStep.node_x : 100 + (workflow.steps.length - 1) * 280
    const lastY = (lastStep.node_y !== undefined && lastStep.node_y !== null) ? lastStep.node_y : 160

    if (lastStep.action_type === 'condition') {
      return { x: lastX + 320, y: lastY + (workflow.steps.length % 2 === 0 ? 140 : -100) }
    }
    return { x: lastX + 280, y: lastY }
  }

  const quickAddStep = (actionType, customPos = null) => {
    const defaultNames = {
      image_click: '找图点击',
      image_wait: '等待图像出现',
      image_drag: '图像拖拽',
      mouse_click: '坐标点击',
      mouse_longpress: '鼠标长按',
      mouse_drag: '鼠标拖拽',
      mouse_scroll: '滚轮滚动',
      mouse_move: '鼠标移动',
      type_text: '输入文字',
      hotkey: '组合快捷键',
      key_press: '单个按键',
      wait_time: '等待延时',
      condition: '条件判断 (图像存在/不存在)',
    }

    const pos = customPos || calculateSmartNodePosition(actionType)

    const newStep = {
      id: 'step-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      name: defaultNames[actionType] || '新步骤',
      action_type: actionType,
      enabled: true,
      target_type: ['image_click', 'image_wait', 'image_drag', 'condition'].includes(actionType) ? 'image' : 'coordinate',
      x: actionType === 'mouse_scroll' ? 0 : 500,
      y: actionType === 'mouse_scroll' ? 0 : 300,
      offset_x: 0,
      offset_y: 0,
      drag_to_x: 700,
      drag_to_y: 300,
      drag_duration: 0.5,
      smooth_drag: true,
      mouse_button: 'left',
      click_type: 'single',
      press_duration: 1.0,
      scroll_amount: -3,
      text_to_type: actionType === 'type_text' ? '你好世界' : '',
      use_clipboard: true,
      hotkeys: actionType === 'hotkey' ? ['ctrl', 'c'] : [],
      key_press_key: actionType === 'key_press' ? 'enter' : '',
      image_base64: null,
      confidence: 0.8,
      match_method: 'TM_CCOEFF_NORMED',
      use_grayscale: true,
      multi_scale: false,
      wait_timeout: 5.0,
      wait_for_disappear: false,
      condition_type: 'image_exists',
      then_action: 'continue',
      then_jump_step: 1,
      then_skip_count: 1,
      else_action: 'continue',
      else_jump_step: 1,
      else_skip_count: 1,
      next_action: 'continue',
      next_jump_step: 1,
      pre_delay: actionType === 'wait_time' ? 1.0 : 0.0,
      post_delay: 0.2,
      retry_count: 1,
      retry_interval: 0.5,
      on_failure: 'stop',
      node_x: Math.round(pos.x),
      node_y: Math.round(pos.y),
      comment: '',
    }

    workflow.steps.push(newStep)
    selectStep(workflow.steps.length - 1)
    syncWorkflow()

    if (actionType === 'image_click' || actionType === 'image_wait' || actionType === 'condition') {
      showToast('点击【截取目标】即可框选要识别的目标', 'info')
    }
  }

  const updateStepPosition = (index, x, y) => {
    if (index >= 0 && index < workflow.steps.length) {
      workflow.steps[index].node_x = Math.round(x)
      workflow.steps[index].node_y = Math.round(y)
      syncWorkflow()
    }
  }

  const autoLayoutNodes = () => {
    if (!workflow.steps || workflow.steps.length === 0) return

    // Position root and sequential flow horizontally with branch offsets
    let curX = 80
    let curY = 160
    const startY = 160

    workflow.steps.forEach((step, idx) => {
      if (idx === 0) {
        step.node_x = curX
        step.node_y = curY
        curX += 280
      } else {
        const prevStep = workflow.steps[idx - 1]
        if (prevStep.action_type === 'condition') {
          // If previous was condition, place next sequential step
          step.node_x = curX
          step.node_y = curY
          curX += 280
        } else {
          step.node_x = curX
          step.node_y = startY
          curX += 280
        }
      }
    })

    syncWorkflow()
    showToast('已完成画布智能排版对齐', 'success')
  }

  const connectSteps = (sourceIndex, targetIndex, portType = 'next') => {
    if (sourceIndex < 0 || sourceIndex >= workflow.steps.length) return
    if (targetIndex < 0 || targetIndex >= workflow.steps.length) return
    if (sourceIndex === targetIndex) return

    const sourceStep = workflow.steps[sourceIndex]
    const targetStepNum = targetIndex + 1

    if (portType === 'then') {
      sourceStep.then_action = 'jump'
      sourceStep.then_jump_step = targetStepNum
      showToast(`已建立分支连线: 成立时跳转至步骤 #${targetStepNum}`, 'success')
    } else if (portType === 'else') {
      sourceStep.else_action = 'jump'
      sourceStep.else_jump_step = targetStepNum
      showToast(`已建立分支连线: 不成立时跳转至步骤 #${targetStepNum}`, 'success')
    } else {
      // Default next port (Condition or Standard Action)
      if (sourceStep.action_type === 'condition') {
        sourceStep.then_action = 'jump'
        sourceStep.then_jump_step = targetStepNum
        showToast(`已建立分支连线: 成立时跳转至步骤 #${targetStepNum}`, 'success')
      } else if (targetIndex === sourceIndex + 1) {
        // Natural sequence
        sourceStep.next_action = 'continue'
        sourceStep.next_jump_step = targetStepNum
        showToast(`步骤 #${sourceIndex + 1} 顺序执行步骤 #${targetStepNum}`, 'info')
      } else {
        // Custom jump / loop back
        sourceStep.next_action = 'jump'
        sourceStep.next_jump_step = targetStepNum
        showToast(`已建立跳转连线: 步骤 #${sourceIndex + 1} 执行后跳转至步骤 #${targetStepNum}`, 'success')
      }
    }
    syncWorkflow()
  }

  const disconnectBranch = (sourceIndex, portType) => {
    if (sourceIndex < 0 || sourceIndex >= workflow.steps.length) return
    const step = workflow.steps[sourceIndex]
    if (portType === 'then') {
      step.then_action = 'continue'
      showToast(`已重置步骤 #${sourceIndex + 1} 成立分支为继续执行`, 'info')
    } else if (portType === 'else') {
      step.else_action = 'continue'
      showToast(`已重置步骤 #${sourceIndex + 1} 不成立分支为继续执行`, 'info')
    } else if (portType === 'next') {
      step.next_action = 'continue'
      showToast(`已重置步骤 #${sourceIndex + 1} 后续流向为顺序执行`, 'info')
    }
    syncWorkflow()
  }

  const updateEdgeCustomWaypoint = (sourceIndex, portType, waypoint) => {
    if (sourceIndex < 0 || sourceIndex >= workflow.steps.length) return
    const step = workflow.steps[sourceIndex]
    if (!step.metadata) step.metadata = {}
    if (!step.metadata.custom_routes) step.metadata.custom_routes = {}
    step.metadata.custom_routes[portType] = {
      x: Math.round(waypoint.x),
      y: Math.round(waypoint.y),
    }
    syncWorkflow()
  }

  const resetEdgeCustomWaypoint = (sourceIndex, portType) => {
    if (sourceIndex < 0 || sourceIndex >= workflow.steps.length) return
    const step = workflow.steps[sourceIndex]
    if (step.metadata && step.metadata.custom_routes && step.metadata.custom_routes[portType]) {
      delete step.metadata.custom_routes[portType]
      syncWorkflow()
      showToast(`已重置连线为自动智能避让`, 'info')
    }
  }

  const updateCurrentStep = (key, value) => {
    if (selectedStep.value) {
      selectedStep.value[key] = value
      syncWorkflow()
    }
  }

  const changeStepActionType = (newType) => {
    if (!selectedStep.value) return
    selectedStep.value.action_type = newType
    selectedStep.value.target_type = ['image_click', 'image_wait', 'image_drag', 'condition'].includes(newType) ? 'image' : 'coordinate'
    syncWorkflow()
  }

  const setHotkeyString = (str) => {
    if (!selectedStep.value) return
    const keys = str.split('+').map(k => k.trim().toLowerCase()).filter(Boolean)
    selectedStep.value.hotkeys = keys
    selectedStep.value.key_press_key = keys.length === 1 ? keys[0] : ''
    syncWorkflow()
  }

  const deleteStep = (index) => {
    workflow.steps.splice(index, 1)
    if (selectedStepIndex.value >= workflow.steps.length) {
      selectedStepIndex.value = workflow.steps.length - 1
    }
    syncWorkflow()
  }

  const duplicateStep = (index) => {
    const orig = workflow.steps[index]
    const clone = JSON.parse(JSON.stringify(orig))
    clone.id = 'step-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
    clone.name = clone.name + ' (副本)'
    workflow.steps.splice(index + 1, 0, clone)
    selectStep(index + 1)
    syncWorkflow()
  }

  const moveStep = (index, direction) => {
    const newIdx = index + direction
    if (newIdx < 0 || newIdx >= workflow.steps.length) return
    const [moved] = workflow.steps.splice(index, 1)
    workflow.steps.splice(newIdx, 0, moved)
    selectStep(newIdx)
    syncWorkflow()
  }

  const reorderSteps = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    const [moved] = workflow.steps.splice(fromIndex, 1)
    workflow.steps.splice(toIndex, 0, moved)
    selectStep(toIndex)
    syncWorkflow()
  }

  const clearAllSteps = () => {
    workflow.steps = []
    selectedStepIndex.value = -1
    syncWorkflow()
  }

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
    workflow,
    filePath,
    fileName,
    selectedStepIndex,
    selectedStep,
    selectStep,
    quickAddStep,
    updateCurrentStep,
    changeStepActionType,
    setHotkeyString,
    deleteStep,
    duplicateStep,
    moveStep,
    reorderSteps,
    clearAllSteps,
    newWorkflow,
    openWorkflow,
    saveWorkflow,
    loadSampleTemplate,
    startSnipForCurrentStep,
    testMatchForCurrentStep,
    pickMousePosForCurrentStep,
    pickDragEndPos,
    testSingleStep,
    syncWorkflow,
    initWorkflowListeners,
    viewMode,
    edgeStyle,
    updateStepPosition,
    autoLayoutNodes,
    connectSteps,
    disconnectBranch,
    updateEdgeCustomWaypoint,
    resetEdgeCustomWaypoint,
  }
}
