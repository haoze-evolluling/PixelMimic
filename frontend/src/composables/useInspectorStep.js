import { computed, ref } from 'vue'
import { useWorkflow } from './useWorkflow'
import { IMAGE_ACTION_TYPES } from '../utils/actionCatalog'

/**
 * useInspectorStep.js
 * 步骤属性面板的派生状态：动作类型判定标志与双向绑定的派生字段。
 */
export function useInspectorStep() {
  const { selectedStep, updateCurrentStep, setHotkeyString } = useWorkflow()

  const isActionType = (types) =>
    computed(() => (selectedStep.value ? types.includes(selectedStep.value.action_type) : false))

  // 复用 actionCatalog 的单一数据源，避免此处再硬编码一份类型清单导致两边漂移
  const isImageAction = isActionType(IMAGE_ACTION_TYPES)

  const isCondition = computed(() => {
    if (!selectedStep.value) return false
    return selectedStep.value.action_type === 'condition'
  })

  const isMouseClick = isActionType(['mouse_click', 'mouse_longpress'])
  const isScroll = isActionType(['mouse_scroll'])
  const isMove = isActionType(['mouse_move'])
  const isDrag = isActionType(['mouse_drag', 'image_drag'])
  const isText = isActionType(['type_text'])
  const isHotkey = isActionType(['hotkey', 'key_press'])
  const isWait = isActionType(['wait_time'])

  const scrollDirection = computed({
    get() {
      if (!selectedStep.value) return 'down'
      return (selectedStep.value.scroll_amount !== undefined ? selectedStep.value.scroll_amount : -3) >= 0 ? 'up' : 'down'
    },
    set(val) {
      const curMag = Math.abs(selectedStep.value?.scroll_amount || 3)
      updateCurrentStep('scroll_amount', val === 'up' ? curMag : -curMag)
    },
  })

  const scrollMagnitude = computed({
    get() {
      if (!selectedStep.value) return 3
      return Math.abs(selectedStep.value.scroll_amount !== undefined ? selectedStep.value.scroll_amount : 3)
    },
    set(val) {
      const dir = scrollDirection.value === 'up' ? 1 : -1
      const mag = Math.max(1, parseInt(val) || 1)
      updateCurrentStep('scroll_amount', dir * mag)
    },
  })

  const hotkeyInputString = computed({
    get() {
      if (!selectedStep.value) return ''
      if (selectedStep.value.hotkeys && selectedStep.value.hotkeys.length > 0) {
        return selectedStep.value.hotkeys.join('+')
      }
      return selectedStep.value.key_press_key || ''
    },
    set(val) {
      setHotkeyString(val)
    },
  })

  const confidencePercent = computed({
    get() {
      if (!selectedStep.value) return 80
      return Math.round((selectedStep.value.confidence !== undefined ? selectedStep.value.confidence : 0.8) * 100)
    },
    set(val) {
      updateCurrentStep('confidence', parseFloat(val) / 100)
    },
  })

  const commonHotkeys = [
    { label: 'Ctrl+C 复制', key: 'ctrl+c' },
    { label: 'Ctrl+V 粘贴', key: 'ctrl+v' },
    { label: 'Ctrl+A 全选', key: 'ctrl+a' },
    { label: 'Enter 回车', key: 'enter' },
    { label: 'Esc 取消', key: 'esc' },
    { label: 'Tab 切换', key: 'tab' },
  ]

  return {
    selectedStep,
    isImageAction,
    isCondition,
    isMouseClick,
    isScroll,
    isMove,
    isDrag,
    isText,
    isHotkey,
    isWait,
    scrollDirection,
    scrollMagnitude,
    hotkeyInputString,
    confidencePercent,
    commonHotkeys,
  }
}
