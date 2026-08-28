/**
 * devMock.js
 * 仅开发模式且 URL 带 ?mock=1 时生效：向前端注入一份与真实运行一致的示例流程，
 * 便于在纯浏览器中调试验证画布、连线与标签渲染（无需 pywebview 后端）。
 */
import { workflow } from './composables/useWorkflow'

const baseStep = {
  id: 'mock-' + Math.random().toString(36).slice(2, 8),
  enabled: true,
  target_type: 'coordinate',
  x: 0,
  y: 0,
  offset_x: 0,
  offset_y: 0,
  drag_to_x: 0,
  drag_to_y: 0,
  drag_duration: 0.5,
  smooth_drag: true,
  mouse_button: 'left',
  click_type: 'single',
  press_duration: 1.0,
  scroll_amount: -3,
  text_to_type: '',
  use_clipboard: true,
  hotkeys: [],
  key_press_key: '',
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
  pre_delay: 0,
  post_delay: 0.2,
  retry_count: 1,
  retry_interval: 0.5,
  on_failure: 'stop',
  comment: '',
}

export function injectMockWorkflow() {
  const spacing = 320
  const mk = (over) => ({ ...baseStep, ...over, id: 'mock-' + Math.random().toString(36).slice(2, 8) })

  workflow.steps.push(
    mk({
      name: '找图点击',
      action_type: 'image_click',
      target_type: 'image',
      x: 471,
      y: 496,
      next_action: 'continue',
      node_x: 80,
      node_y: 160,
    }),
    mk({
      name: '条件判断 (图像存在/不存在)',
      action_type: 'condition',
      target_type: 'image',
      condition_type: 'image_not_exists',
      then_action: 'jump',
      then_jump_step: 1,
      else_action: 'continue',
      else_jump_step: 3,
      node_x: 80 + spacing,
      node_y: 160,
    }),
    mk({
      name: '滚轮滚动',
      action_type: 'mouse_scroll',
      scroll_amount: -100,
      next_action: 'jump',
      next_jump_step: 1,
      node_x: 80 + spacing * 2,
      node_y: 160,
    })
  )
}
