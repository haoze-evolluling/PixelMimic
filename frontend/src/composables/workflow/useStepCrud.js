import { toRaw } from 'vue'
import { useToast } from '../useToast'
import { useExecution } from '../useExecution'
import { useWorkflowStore } from './workflowStore'
import { calculateSmartNodePosition, createStep } from './stepFactory'
import { isImageActionType } from '../../utils/actionCatalog'
import { snapToGrid } from '../../utils/edgeRouting'
import { NODE_FALLBACK_X, NODE_FALLBACK_Y } from '../../utils/canvasPorts'

/**
 * useStepCrud.js
 * 步骤的增删改、画布连线与节点摆放等纯数据操作（不含文件 IO）。
 */
export function useStepCrud() {
  const { showToast } = useToast()
  const { stepStatuses } = useExecution()
  const { workflow, selectedStepIndex, selectedStep, selectStep, syncWorkflow } = useWorkflowStore()

  const quickAddStep = (actionType, customPos = null) => {
    const pos = customPos || calculateSmartNodePosition(workflow.steps)

    workflow.steps.push(createStep(actionType, pos))
    selectStep(workflow.steps.length - 1)
    syncWorkflow()

    if (actionType === 'image_click' || actionType === 'image_wait') {
      showToast('点击【截取目标】即可框选要识别的目标', 'info')
    }
  }

  // 节点拖拽落点吸附到画布网格，保证端口与连线端点始终落在网格点上
  const updateStepPosition = (index, x, y) => {
    if (index >= 0 && index < workflow.steps.length) {
      workflow.steps[index].node_x = snapToGrid(x)
      workflow.steps[index].node_y = snapToGrid(y)
      syncWorkflow()
    }
  }

  // 将所有节点坐标对齐到网格（打开旧文件 / 载入模板后调用）
  const normalizeStepPositions = () => {
    workflow.steps.forEach((step) => {
      step.node_x = snapToGrid(step.node_x ?? NODE_FALLBACK_X)
      step.node_y = snapToGrid(step.node_y ?? NODE_FALLBACK_Y)
    })
  }

  const autoLayoutNodes = () => {
    if (!workflow.steps || workflow.steps.length === 0) return

    // 统一网格行布局：按步骤顺序从左到右排列，间距为连线走廊和标签留足空间，
    // 回跳/分支连线由 edgeRouting 的通道错位算法自动分层避让
    const startX = 80
    const rowY = 160
    const spacing = 320 // 节点宽 220 + 100 间隙

    workflow.steps.forEach((step, idx) => {
      step.node_x = startX + idx * spacing
      step.node_y = rowY
    })

    syncWorkflow()
    showToast('已完成画布智能排版对齐', 'success')
  }

  const connectSteps = (sourceIndex, targetIndex, portType = 'next') => {
    if (sourceIndex < 0 || sourceIndex >= workflow.steps.length) return
    if (targetIndex < 0 || targetIndex >= workflow.steps.length) return

    const sourceStep = workflow.steps[sourceIndex]
    const targetStepNum = targetIndex + 1
    const isSelfLoop = sourceIndex === targetIndex

    if (portType === 'then') {
      sourceStep.then_action = 'jump'
      sourceStep.then_jump_step = targetStepNum
      showToast(`已建立分支连线: 成立时跳转至步骤 #${targetStepNum}`, 'success')
    } else if (portType === 'else') {
      sourceStep.else_action = 'jump'
      sourceStep.else_jump_step = targetStepNum
      showToast(`已建立分支连线: 不成立时跳转至步骤 #${targetStepNum}`, 'success')
    } else if (portType === 'fail') {
      sourceStep.fail_action = 'jump'
      sourceStep.fail_jump_step = targetStepNum
      showToast(
        isSelfLoop
          ? `已建立自循环连线: 步骤 #${targetStepNum} 失败后重复执行自身`
          : `已建立失败分支连线: 步骤 #${sourceIndex + 1} 失败时跳转至步骤 #${targetStepNum}`,
        'success'
      )
    } else {
      // Default next port (Condition or Standard Action)
      if (sourceStep.action_type === 'condition') {
        sourceStep.then_action = 'jump'
        sourceStep.then_jump_step = targetStepNum
        showToast(`已建立分支连线: 成立时跳转至步骤 #${targetStepNum}`, 'success')
      } else if (!isSelfLoop && targetIndex === sourceIndex + 1) {
        // Natural sequence
        sourceStep.next_action = 'continue'
        sourceStep.next_jump_step = targetStepNum
        showToast(`步骤 #${sourceIndex + 1} 顺序执行步骤 #${targetStepNum}`, 'info')
      } else {
        // Custom jump / loop back
        sourceStep.next_action = 'jump'
        sourceStep.next_jump_step = targetStepNum
        showToast(
          isSelfLoop
            ? `已建立自循环连线: 步骤 #${targetStepNum} 执行成功后重复执行自身`
            : `已建立跳转连线: 步骤 #${sourceIndex + 1} 执行后跳转至步骤 #${targetStepNum}`,
          'success'
        )
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
    } else if (portType === 'fail') {
      step.fail_action = 'default'
      step.fail_jump_step = null
      showToast(`已重置步骤 #${sourceIndex + 1} 失败分支为默认失败策略`, 'info')
    } else if (portType === 'next') {
      step.next_action = 'continue'
      showToast(`已重置步骤 #${sourceIndex + 1} 后续流向为顺序执行`, 'info')
    }
    syncWorkflow()
  }

  /**
   * 保存用户自绘/拖拽调整后的连线正交路径（仅转折点，网格吸附）。
   * @param {number} sourceIndex 源步骤下标
   * @param {string} portType 端口类型（next/fail/then/else）
   * @param {Array<{x:number,y:number}>} points 完整路径点（首末为端口点，存储时剔除）
   */
  const setEdgeCustomRoute = (sourceIndex, portType, points) => {
    if (sourceIndex < 0 || sourceIndex >= workflow.steps.length) return
    const step = workflow.steps[sourceIndex]
    if (!step.metadata) step.metadata = {}
    if (!step.metadata.custom_routes) step.metadata.custom_routes = {}
    const mids = (points || []).map(p => ({ x: snapToGrid(p.x), y: snapToGrid(p.y) }))
    if (mids.length === 0) {
      delete step.metadata.custom_routes[portType]
    } else {
      step.metadata.custom_routes[portType] = mids
    }
    syncWorkflow()
  }

  // 复位连线：清除自定义路径，恢复系统自动计算的正交路由
  const resetEdgeRoute = (sourceIndex, portType) => {
    if (sourceIndex < 0 || sourceIndex >= workflow.steps.length) return
    const step = workflow.steps[sourceIndex]
    if (step.metadata && step.metadata.custom_routes && step.metadata.custom_routes[portType]) {
      delete step.metadata.custom_routes[portType]
      syncWorkflow()
      showToast('已复位连线为自动路径', 'info')
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
    selectedStep.value.target_type = isImageActionType(newType) ? 'image' : 'coordinate'
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
    // Shift run statuses after the deleted index down by one so they stay
    // aligned with the remaining steps
    delete stepStatuses[index]
    Object.keys(stepStatuses)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((i) => {
        if (i > index) {
          stepStatuses[i - 1] = stepStatuses[i]
          delete stepStatuses[i]
        }
      })
    if (selectedStepIndex.value >= workflow.steps.length) {
      selectedStepIndex.value = workflow.steps.length - 1
    }
    syncWorkflow()
  }

  const duplicateStep = (index) => {
    const orig = workflow.steps[index]
    const clone = structuredClone(toRaw(orig))
    clone.id = 'step-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
    clone.name = clone.name + ' (副本)'
    workflow.steps.splice(index + 1, 0, clone)
    selectStep(index + 1)
    syncWorkflow()
  }

  const clearAllSteps = () => {
    workflow.steps = []
    selectedStepIndex.value = -1
    syncWorkflow()
  }

  return {
    quickAddStep,
    updateStepPosition,
    normalizeStepPositions,
    autoLayoutNodes,
    connectSteps,
    disconnectBranch,
    setEdgeCustomRoute,
    resetEdgeRoute,
    updateCurrentStep,
    changeStepActionType,
    setHotkeyString,
    deleteStep,
    duplicateStep,
    clearAllSteps,
  }
}
