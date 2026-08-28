/**
 * Natural language description generator for workflow steps.
 * Generates human-readable step explanations cleanly without emoji icons.
 */

export function getNaturalDescription(step) {
  if (!step) return ''
  const act = step.action_type || 'mouse_click'
  const btnMap = { left: '左键', right: '右键', middle: '中键' }
  const clickMap = { single: '单击', double: '双击', triple: '三击', down: '按下', up: '释放' }
  const btnText = `${clickMap[step.click_type || 'single'] || '单击'}${btnMap[step.mouse_button || 'left'] || '左键'}`

  switch (act) {
    case 'image_click': {
      let offsetStr = (step.offset_x || step.offset_y) ? ` (偏移 X:${step.offset_x || 0}, Y:${step.offset_y || 0})` : ''
      if (step.image_base64) {
        return {
          type: 'image_click',
          prefix: '在屏幕上找到目标图像并',
          action: btnText + offsetStr,
          hasImage: true,
          image: `data:image/png;base64,${step.image_base64}`,
        }
      }
      return {
        type: 'image_click',
        prefix: '在屏幕上找到 [未设置图片] 并',
        action: btnText + offsetStr,
        hasImage: false,
      }
    }
    case 'mouse_click':
      return {
        type: 'text',
        text: `在坐标 (X: ${step.x || 0}, Y: ${step.y || 0}) ${btnText}`,
      }
    case 'mouse_longpress':
      return {
        type: 'text',
        text: `在坐标 (X: ${step.x || 0}, Y: ${step.y || 0}) 长按 ${btnMap[step.mouse_button || 'left'] || '左键'} ${step.press_duration || 1.0} 秒`,
      }
    case 'mouse_drag':
      return {
        type: 'text',
        text: `从 (${step.x || 0}, ${step.y || 0}) 平滑拖拽至 (${step.drag_to_x || 0}, ${step.drag_to_y || 0}) (耗时 ${step.drag_duration || 0.5}s)`,
      }
    case 'mouse_move':
      return {
        type: 'text',
        text: `移动鼠标至坐标 (X: ${step.x || 0}, Y: ${step.y || 0})`,
      }
    case 'image_drag': {
      if (step.image_base64) {
        return {
          type: 'image_click',
          prefix: '识别目标图像并拖拽至',
          action: `(${step.drag_to_x || 0}, ${step.drag_to_y || 0})`,
          hasImage: true,
          image: `data:image/png;base64,${step.image_base64}`,
        }
      }
      return {
        type: 'text',
        text: `识别目标图像 [未设置图片] 并拖拽至 (${step.drag_to_x || 0}, ${step.drag_to_y || 0})`,
      }
    }
    case 'mouse_scroll': {
      const amt = step.scroll_amount !== undefined ? step.scroll_amount : -3
      const dir = amt >= 0 ? `向上滚动 ${amt} 格` : `向下滚动 ${Math.abs(amt)} 格`
      const hasPos = (step.x > 0 || step.y > 0)
      const posText = hasPos ? `在坐标 (${step.x || 0}, ${step.y || 0}) ` : '在当前位置 '
      return {
        type: 'text',
        text: `${posText}鼠标滚轮${dir}`,
      }
    }
    case 'condition': {
      const formatBranch = (act, jump, skip) => {
        if (act === 'jump') return `跳转至第 ${jump || 1} 步`
        if (act === 'skip') return `跳过 ${skip || 1} 步`
        if (act === 'stop') return '终止流程'
        return '继续'
      }
      const isNot = step.condition_type === 'image_not_exists'
      const condLabel = isNot ? '未出现目标图像' : '出现目标图像'
      const thenText = formatBranch(step.then_action, step.then_jump_step, step.then_skip_count)
      const elseText = formatBranch(step.else_action, step.else_jump_step, step.else_skip_count)

      if (step.image_base64) {
        return {
          type: 'condition',
          prefix: `条件判断 (若${isNot ? '不存在' : '存在'}`,
          action: `): 是则[${thenText}], 否则[${elseText}]`,
          hasImage: true,
          image: `data:image/png;base64,${step.image_base64}`,
        }
      }
      return {
        type: 'text',
        text: `条件判断: 若${condLabel} -> 是则[${thenText}], 否则[${elseText}]`,
      }
    }
    case 'type_text': {
      const txt = step.text_to_type || ''
      const preview = txt.length > 24 ? txt.slice(0, 24) + '...' : txt
      return {
        type: 'text',
        text: `输入文字 "${preview}" ${step.use_clipboard ? '[剪贴板]' : ''}`,
      }
    }
    case 'hotkey': {
      const keys = (step.hotkeys && step.hotkeys.length > 0) ? step.hotkeys.join(' + ') : (step.key_press_key || '无')
      return {
        type: 'text',
        text: `按下快捷键 [ ${keys.toUpperCase()} ]`,
      }
    }
    case 'key_press':
      return {
        type: 'text',
        text: `按下单键 [ ${(step.key_press_key || 'Enter').toUpperCase()} ]`,
      }
    case 'wait_time':
      return {
        type: 'text',
        text: `等待延时 ${step.pre_delay || 1.0} 秒`,
      }
    case 'image_wait': {
      const mode = step.wait_for_disappear ? '消失' : '出现'
      if (step.image_base64) {
        return {
          type: 'image_wait',
          prefix: '等待目标图像',
          action: `${mode} (超时: ${step.wait_timeout || 5}s)`,
          hasImage: true,
          image: `data:image/png;base64,${step.image_base64}`,
        }
      }
      return {
        type: 'text',
        text: `等待目标图像 [未设置图片] ${mode} (超时: ${step.wait_timeout || 5}s)`,
      }
    }
    default:
      return {
        type: 'text',
        text: `执行动作: ${act}`,
      }
  }
}
