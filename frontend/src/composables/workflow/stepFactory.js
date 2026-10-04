import { isImageActionType, getActionLabel } from '../../utils/actionCatalog'

/**
 * stepFactory.js
 * 步骤节点的默认值工厂：新建节点与智能摆放位置。
 */

export const DEFAULT_NODE_X = 100
export const DEFAULT_NODE_Y = 160

/**
 * 依据现有节点为新增节点计算一个不重叠的摆放位置
 */
export function calculateSmartNodePosition(steps) {
  if (!steps || steps.length === 0) {
    return { x: DEFAULT_NODE_X, y: DEFAULT_NODE_Y }
  }
  const lastStep = steps[steps.length - 1]
  const lastX = (lastStep.node_x !== undefined && lastStep.node_x !== null) ? lastStep.node_x : 100 + (steps.length - 1) * 280
  const lastY = (lastStep.node_y !== undefined && lastStep.node_y !== null) ? lastStep.node_y : 160

  if (lastStep.action_type === 'condition') {
    return { x: lastX + 320, y: lastY + (steps.length % 2 === 0 ? 140 : -100) }
  }
  return { x: lastX + 280, y: lastY }
}

/**
 * 创建一个带有全量默认字段的步骤节点
 */
export function createStep(actionType, pos) {
  return {
    id: 'step-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    name: getActionLabel(actionType),
    action_type: actionType,
    enabled: true,
    target_type: isImageActionType(actionType) ? 'image' : 'coordinate',
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
    fail_action: 'default',
    fail_jump_step: null,
    pre_delay: actionType === 'wait_time' ? 1.0 : 0.0,
    post_delay: 0.2,
    retry_count: 1,
    retry_interval: 0.5,
    on_failure: 'stop',
    node_x: Math.round(pos.x),
    node_y: Math.round(pos.y),
    comment: '',
  }
}
